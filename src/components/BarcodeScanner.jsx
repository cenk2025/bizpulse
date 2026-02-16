import { useEffect, useRef, useState, useCallback } from 'react'
import Quagga from '@ericblade/quagga2'
import { Camera, X, ScanLine, AlertCircle, Upload, Keyboard } from 'lucide-react'

/**
 * Finnish Virtual Barcode (Virtuaaliviivakoodi) Parser
 * Version 4 (domestic reference): 54 characters
 * Version 5 (international RF reference): 54 characters
 * 
 * Format (Version 4):
 * Pos 1:      Version (4)
 * Pos 2-17:   IBAN account number (16 digits, without "FI")
 * Pos 18-23:  EUR amount (6 digits, zero-padded)
 * Pos 24-25:  Cents (2 digits)
 * Pos 26-28:  Reserved/padding (000)
 * Pos 29-48:  Reference number (20 digits, zero-padded, right-aligned)
 * Pos 49-54:  Due date (YYMMDD)
 */
export function parseFinnishBarcode(code) {
    if (!code || code.length < 54) return null

    // Remove spaces
    const raw = code.replace(/\s/g, '')
    if (raw.length !== 54) return null

    const version = raw.charAt(0)
    if (version !== '4' && version !== '5') return null

    try {
        // IBAN
        const ibanDigits = raw.substring(1, 17)
        const iban = `FI${ibanDigits}`

        // Amount
        const eurPart = parseInt(raw.substring(17, 23), 10)
        const centPart = parseInt(raw.substring(23, 25), 10)
        const amount = eurPart + centPart / 100

        // Reference number
        const refRaw = raw.substring(28, 48)
        const referenceNumber = refRaw.replace(/^0+/, '') // trim leading zeros

        // Due date
        const dateStr = raw.substring(48, 54)
        const year = 2000 + parseInt(dateStr.substring(0, 2), 10)
        const month = parseInt(dateStr.substring(2, 4), 10)
        const day = parseInt(dateStr.substring(4, 6), 10)
        const dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        // Format reference number with spaces (Finnish style: groups of 5 from right)
        let formattedRef = ''
        const refStr = referenceNumber
        for (let i = refStr.length; i > 0; i -= 5) {
            const start = Math.max(0, i - 5)
            formattedRef = refStr.substring(start, i) + (formattedRef ? ' ' : '') + formattedRef
        }

        return {
            version,
            iban,
            amount,
            referenceNumber: formattedRef.trim(),
            dueDate,
            raw: raw,
        }
    } catch {
        return null
    }
}

/**
 * Format IBAN with spaces (FI38 5000 0120 2136 80)
 */
export function formatIBAN(iban) {
    if (!iban) return ''
    const clean = iban.replace(/\s/g, '').toUpperCase()
    return clean.replace(/(.{4})/g, '$1 ').trim()
}

/**
 * Scan barcode from an image file using Quagga2
 */
function scanImageWithQuagga(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            Quagga.decodeSingle({
                src: reader.result,
                numOfWorkers: 0,
                locate: true,
                inputStream: {
                    size: 1920,
                },
                decoder: {
                    readers: [
                        'code_128_reader',
                        'ean_reader',
                        'code_39_reader',
                        'i2of5_reader',
                        'codabar_reader',
                    ],
                    multiple: false,
                },
                locator: {
                    patchSize: 'medium',
                    halfSample: true,
                },
            }, (result) => {
                if (result && result.codeResult) {
                    resolve(result.codeResult.code)
                } else {
                    reject(new Error('not_found'))
                }
            })
        }
        reader.onerror = () => reject(new Error('read_error'))
        reader.readAsDataURL(file)
    })
}

export default function BarcodeScanner({ onScanResult, onClose }) {
    const liveStreamRef = useRef(null)
    const fileInputRef = useRef(null)
    const [error, setError] = useState(null)
    const [scanning, setScanning] = useState(false)
    const [mode, setMode] = useState('choose') // 'choose' | 'camera' | 'manual'
    const [manualCode, setManualCode] = useState('')
    const [processing, setProcessing] = useState(false)

    const handleResult = useCallback((decodedText) => {
        const parsed = parseFinnishBarcode(decodedText)
        if (parsed) {
            onScanResult(parsed)
        } else {
            onScanResult({ raw: decodedText, error: 'Ei kelvollinen suomalainen viivakoodi (' + decodedText.length + ' merkkiä)' })
        }
    }, [onScanResult])

    // Live camera scanning with Quagga
    useEffect(() => {
        if (mode !== 'camera') return
        let mounted = true

        // Small delay to let DOM render
        const timer = setTimeout(() => {
            if (!mounted) return

            Quagga.init({
                inputStream: {
                    type: 'LiveStream',
                    target: document.getElementById('barcode-live'),
                    constraints: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                },
                decoder: {
                    readers: [
                        'code_128_reader',
                        'ean_reader',
                        'code_39_reader',
                        'i2of5_reader',
                    ],
                    multiple: false,
                },
                locator: {
                    patchSize: 'large',
                    halfSample: true,
                },
                frequency: 15,
                locate: true,
            }, (err) => {
                if (err) {
                    console.error('Quagga init error:', err)
                    if (mounted) {
                        setError(
                            err.toString().includes('NotAllowedError')
                                ? 'Kameran käyttö estetty. Anna lupa selaimen asetuksista.'
                                : err.toString().includes('NotFoundError')
                                    ? 'Kameraa ei löydy.'
                                    : 'Kameraa ei voitu käynnistää: ' + err.message
                        )
                    }
                    return
                }

                if (mounted) {
                    Quagga.start()
                    setScanning(true)
                }
            })

            // Track consecutive reads for accuracy
            let lastCode = ''
            let matchCount = 0

            Quagga.onDetected((result) => {
                if (result && result.codeResult && result.codeResult.code) {
                    const code = result.codeResult.code.replace(/\s/g, '')

                    // Only accept valid Finnish virtuaaliviivakoodi (54 chars, starts with 4 or 5)
                    if (code.length !== 54 || (code[0] !== '4' && code[0] !== '5')) {
                        return // Keep scanning — ignore partial reads
                    }

                    // Require 2 consecutive matching reads for reliability
                    if (code === lastCode) {
                        matchCount++
                    } else {
                        lastCode = code
                        matchCount = 1
                    }

                    if (matchCount >= 2) {
                        Quagga.stop()
                        handleResult(code)
                    }
                }
            })
        }, 400)

        return () => {
            mounted = false
            clearTimeout(timer)
            try { Quagga.stop() } catch { /* not running */ }
            try { Quagga.offDetected() } catch { /* not registered */ }
        }
    }, [mode, handleResult])

    // Process selected image file with Quagga
    async function handleFileUpload(e) {
        const file = e.target.files?.[0]
        if (!file) return
        setProcessing(true)
        setError(null)

        try {
            const code = await scanImageWithQuagga(file)
            handleResult(code)
        } catch (err) {
            console.error('Image scan error:', err)
            setError('Viivakoodia ei löydy kuvasta. Kokeile ottaa selkeämpi kuva tai syötä koodi manuaalisesti.')
            setProcessing(false)
        }

        // Reset file input so the same file can be selected again
        e.target.value = ''
    }

    // Manual code entry
    function handleManualSubmit(e) {
        e.preventDefault()
        const cleaned = manualCode.replace(/\s/g, '')
        if (cleaned.length === 54) {
            handleResult(cleaned)
        } else {
            setError(`Virtuaaliviivakoodi on 54 merkkiä pitkä. Syöttämäsi koodi: ${cleaned.length} merkkiä.`)
        }
    }

    function handleClose() {
        try { Quagga.stop() } catch { /* not running */ }
        try { Quagga.offDetected() } catch { /* not registered */ }
        onClose()
    }

    return (
        <div className="scanner-overlay" onClick={handleClose}>
            <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
                <div className="scanner-header">
                    <div className="scanner-title">
                        <Camera style={{ width: 20, height: 20 }} />
                        <span>Skannaa viivakoodi</span>
                    </div>
                    <button className="scanner-close" onClick={handleClose}>
                        <X style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                <div className="scanner-body">
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                    />

                    {/* Mode chooser */}
                    {mode === 'choose' && !processing && (
                        <div className="scanner-options">
                            <button
                                className="scanner-option-btn"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload style={{ width: 28, height: 28 }} />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>📸 Ota kuva / Valitse kuva</div>
                                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                                        Ota kuva laskun viivakoodista tai valitse galleriasta
                                    </div>
                                </div>
                            </button>

                            <button
                                className="scanner-option-btn"
                                onClick={() => setMode('camera')}
                            >
                                <Camera style={{ width: 28, height: 28 }} />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>📹 Live-kamera</div>
                                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                                        Skannaa reaaliajassa kameralla
                                    </div>
                                </div>
                            </button>

                            <button
                                className="scanner-option-btn"
                                onClick={() => setMode('manual')}
                            >
                                <Keyboard style={{ width: 28, height: 28 }} />
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>⌨️ Syötä manuaalisesti</div>
                                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                                        Kirjoita 54 merkin virtuaaliviivakoodi
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Processing indicator */}
                    {processing && (
                        <div style={{
                            textAlign: 'center', padding: 40,
                            color: 'var(--text-muted)', fontSize: 14,
                        }}>
                            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                            Käsitellään kuvaa...
                        </div>
                    )}

                    {/* Camera mode */}
                    {mode === 'camera' && (
                        <>
                            {error ? (
                                <div className="scanner-error">
                                    <AlertCircle style={{ width: 32, height: 32 }} />
                                    <p>{error}</p>
                                    <button className="btn btn-ghost" onClick={() => { setError(null); setMode('choose') }}>
                                        Takaisin
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div
                                        id="barcode-live"
                                        ref={liveStreamRef}
                                        className="scanner-viewfinder"
                                        style={{ minHeight: 200 }}
                                    />
                                    {scanning && (
                                        <div className="scanner-hint">
                                            <ScanLine style={{ width: 16, height: 16 }} />
                                            Näytä laskun viivakoodi kameralle
                                        </div>
                                    )}
                                    <button
                                        className="btn btn-ghost"
                                        style={{ width: '100%', marginTop: 12 }}
                                        onClick={() => {
                                            try { Quagga.stop() } catch { /* */ }
                                            setMode('choose')
                                            setScanning(false)
                                        }}
                                    >
                                        ← Takaisin
                                    </button>
                                </>
                            )}
                        </>
                    )}

                    {/* Manual entry mode */}
                    {mode === 'manual' && (
                        <form onSubmit={handleManualSubmit} className="scanner-manual">
                            <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                                Virtuaaliviivakoodi (54 merkkiä)
                            </label>
                            <input
                                type="text"
                                placeholder="4385000012021368002448400003184517230000000260126"
                                value={manualCode}
                                onChange={(e) => { setManualCode(e.target.value); setError(null) }}
                                style={{
                                    fontFamily: 'monospace',
                                    fontSize: 13,
                                    letterSpacing: '0.5px',
                                    padding: '12px 14px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 10,
                                    background: 'var(--bg-main)',
                                    color: 'var(--text-heading)',
                                    width: '100%',
                                }}
                                autoFocus
                            />
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                {manualCode.replace(/\s/g, '').length} / 54 merkkiä
                            </div>
                            {error && <div className="scanner-error" style={{ padding: '8px 0' }}><p>{error}</p></div>}
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => { setMode('choose'); setError(null) }}
                                >
                                    ← Takaisin
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={manualCode.replace(/\s/g, '').length !== 54}
                                    style={{ flex: 1 }}
                                >
                                    Käsittele koodi
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Error for file upload */}
                    {mode === 'choose' && error && !processing && (
                        <div className="scanner-error" style={{ marginTop: 12 }}>
                            <AlertCircle style={{ width: 24, height: 24 }} />
                            <p>{error}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
