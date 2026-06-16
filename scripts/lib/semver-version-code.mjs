/** @param {string} version */
export function semverToAndroidVersionCode(version) {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return 1;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  return major * 10000 + minor * 100 + patch;
}
