const textLineHeightMultiplier = 1.25;

type MeasureTextWidth = (text: string) => number;

export function getTextLineHeight(fontSize: number) {
  return fontSize * textLineHeightMultiplier;
}

export function getTextBaselineOffset({
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

export function splitTextOverlayLines(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

export function wrapTextOverlayLines({
  measureTextWidth,
  text,
  width,
}: {
  measureTextWidth: MeasureTextWidth;
  text: string;
  width: number;
}) {
  const lines = splitTextOverlayLines(text);

  if (width <= 0) {
    return lines;
  }

  return lines.flatMap((line) =>
    line ? wrapTextOverlayLine(line, width, measureTextWidth) : [line],
  );
}

function wrapTextOverlayLine(
  line: string,
  width: number,
  measureTextWidth: MeasureTextWidth,
) {
  const wrappedLines: string[] = [];
  let remainingLine = line;

  while (remainingLine && measureTextWidth(remainingLine) > width) {
    const wrapIndex = getTextWrapIndex(remainingLine, width, measureTextWidth);
    const nextLine = remainingLine.slice(0, wrapIndex).trimEnd();

    wrappedLines.push(nextLine || remainingLine.slice(0, wrapIndex));
    remainingLine = remainingLine.slice(wrapIndex).trimStart();
  }

  wrappedLines.push(remainingLine);

  return wrappedLines;
}

function getTextWrapIndex(
  line: string,
  width: number,
  measureTextWidth: MeasureTextWidth,
) {
  const hardWrapIndex = getHardTextWrapIndex(line, width, measureTextWidth);
  const softWrapIndex = getSoftTextWrapIndex(line, hardWrapIndex);

  return softWrapIndex ?? hardWrapIndex;
}

function getHardTextWrapIndex(
  line: string,
  width: number,
  measureTextWidth: MeasureTextWidth,
) {
  let low = 1;
  let high = line.length;
  let bestFitIndex = 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (measureTextWidth(line.slice(0, middle)) <= width) {
      bestFitIndex = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return bestFitIndex;
}

function getSoftTextWrapIndex(line: string, hardWrapIndex: number) {
  for (let index = hardWrapIndex; index > 0; index -= 1) {
    if (/\s/.test(line[index - 1])) {
      return index;
    }
  }

  return null;
}
