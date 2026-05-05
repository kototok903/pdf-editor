const textLineHeightMultiplier = 1.25;

function getTextLineHeight(fontSize: number) {
  return fontSize * textLineHeightMultiplier;
}

function getTextBaselineOffset({
  fontAscent,
  fontHeight,
  fontSize,
}: {
  fontAscent: number;
  fontHeight: number;
  fontSize: number;
}) {
  return fontAscent + (getTextLineHeight(fontSize) - fontHeight) / 2;
}

function splitTextOverlayLines(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

export { getTextBaselineOffset, getTextLineHeight, splitTextOverlayLines };
