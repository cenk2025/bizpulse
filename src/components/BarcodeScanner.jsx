import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, X, ScanLine, AlertCircle } from 'lucide-react'

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

export default function BarcodeScanner({ onScanResult, onClose }) {
    const scannerRef = useRef(null)
    const html5QrRef = useRef(null)
    const [error, setError] = useState(null)
    const [scanning, setScanning] = useState(false)

    useEffect(() => {
        let mounted = true

        async function startScanner() {
            try {
                const html5Qr = new Html5Qrcode('barcode-reader')
                html5QrRef.current = html5Qr

                const cameras = await Html5Qrcode.getCameras()
                if (!cameras || cameras.length === 0) {
                    setError('Kameraa ei löydy. Tarkista selaimen kameralupa.')
                    return
                }

                // Prefer rear camera
                const rearCamera = cameras.find(c =>
                    c.label.toLowerCase().includes('back') ||
                    c.label.toLowerCase().includes('rear') ||
                    c.label.toLowerCase().includes('environment')
                )
                const cameraId = rearCamera ? rearCamera.id : cameras[0].id

                if (!mounted) return

                await html5Qr.start(
                    cameraId,
                    {
                        fps: 15,
                        qrbox: { width: 350, height: 150 },
                        aspectRatio: 1.7778,
                        formatsToSupport: [
                            Html5QrcodeSupportedFormats.CODE_128,
                            Html5QrcodeSupportedFormats.CODE_39,
                            Html5QrcodeSupportedFormats.ITF,
                            Html5QrcodeSupportedFormats.EAN_13,
                            Html5QrcodeSupportedFormats.CODABAR,
                        ],
                    },
                    (decodedText) => {
                        // Stop scanner on success
                        html5Qr.stop().catch(() => { })

                        // Try to parse Finnish barcode
                        const parsed = parseFinnishBarcode(decodedText)
                        if (parsed) {
                            onScanResult(parsed)
                        } else {
                            // Not a valid Finnish barcode but still got a scan
                            onScanResult({ raw: decodedText, error: 'Ei kelvollinen suomalainen viivakoodi' })
                        }
                    },
                    () => { } // Ignore scan failures (continuous scanning)
                )

                if (mounted) setScanning(true)
            } catch (err) {
                if (mounted) {
                    console.error('Scanner error:', err)
                    setError(
                        err.toString().includes('NotAllowedError')
                            ? 'Kameran käyttö estetty. Anna lupa selaimen asetuksista.'
                            : 'Kameraa ei voitu käynnistää: ' + err.message
                    )
                }
            }
        }

        startScanner()

        return () => {
            mounted = false
            if (html5QrRef.current) {
                html5QrRef.current.stop().catch(() => { })
            }
        }
    }, [onScanResult])

    function handleClose() {
        if (html5QrRef.current) {
            html5QrRef.current.stop().catch(() => { })
        }
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
                    {error ? (
                        <div className="scanner-error">
                            <AlertCircle style={{ width: 32, height: 32 }} />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <>
                            <div
                                id="barcode-reader"
                                ref={scannerRef}
                                className="scanner-viewfinder"
                            />
                            {scanning && (
                                <div className="scanner-hint">
                                    <ScanLine style={{ width: 16, height: 16 }} />
                                    Näytä laskun viivakoodi kameralle
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
