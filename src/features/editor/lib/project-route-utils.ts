export function createProjectPath(projectId: string) {
  return `/projects/${encodeURIComponent(projectId)}`;
}

export function getProjectIdFromPath(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/]+)\/?$/);

  if (!match) {
    return null;
  }

  return decodeURIComponent(match[1]);
}

export function isProjectPath(pathname: string) {
  return /^\/projects(?:\/|$)/.test(pathname);
}
