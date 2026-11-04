import path from 'node:path'

export function avatarStorageRoot(): string {
  const root = path.resolve(process.env.UPLOAD_STORAGE_PATH || '.data/uploads')
  const publicRoot = path.resolve('public')
  // Only the historically supported public path has a static denial rule.
  // Other custom storage locations must be outside the public asset tree.
  if ((root === publicRoot || root.startsWith(publicRoot + path.sep)) && root !== path.join(publicRoot, 'images')) {
    throw new Error('Avatar storage must be outside public')
  }
  return root
}

export function avatarReadRoots(): string[] {
  const root = avatarStorageRoot()
  return process.env.UPLOAD_STORAGE_PATH ? [root] : [root, path.resolve('public/images')]
}
