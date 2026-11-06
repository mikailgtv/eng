declare module "qrcode" {
  const QRCode: {
    toBuffer(
      text: string,
      options?: { type?: "png"; width?: number; margin?: number; errorCorrectionLevel?: "L" | "M" | "Q" | "H" }
    ): Promise<Buffer>;
  };
  export default QRCode;
}
