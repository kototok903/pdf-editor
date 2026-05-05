function createExportFileName(
  originalFileName: string,
  takenFileNames: ReadonlySet<string>,
) {
  if (!takenFileNames.has(originalFileName)) {
    return originalFileName;
  }

  const { baseName, extension } = splitFileName(originalFileName);
  const numberedName = getNumberedBaseName(baseName);

  for (let index = numberedName.nextIndex; ; index += 1) {
    const candidate = `${numberedName.baseName} (${index})${extension}`;

    if (!takenFileNames.has(candidate)) {
      return candidate;
    }
  }
}

function splitFileName(fileName: string) {
  const extensionStart = fileName.lastIndexOf(".");

  if (extensionStart <= 0) {
    return {
      baseName: fileName,
      extension: "",
    };
  }

  return {
    baseName: fileName.slice(0, extensionStart),
    extension: fileName.slice(extensionStart),
  };
}

function getNumberedBaseName(baseName: string) {
  const match = /^(.*) \((\d+)\)$/.exec(baseName);

  if (!match) {
    return { baseName, nextIndex: 1 };
  }

  return {
    baseName: match[1],
    nextIndex: Number(match[2]) + 1,
  };
}

export { createExportFileName };
