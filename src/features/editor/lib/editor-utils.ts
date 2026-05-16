function rgbArrayToHex(value: unknown) {
  const [red = 0, green = 0, blue = 0] = Array.isArray(value) ? value : [];

  return `#${[red, green, blue]
    .map((colorPart) =>
      Math.round(colorPart).toString(16).padStart(2, "0").slice(0, 2),
    )
    .join("")}`;
}

export { rgbArrayToHex };
