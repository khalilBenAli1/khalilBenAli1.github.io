import type { BufferGeometry, Material, Texture } from "three";

type Disposable = BufferGeometry | Material | Texture | { dispose(): void };

/** Every GPU allocation has one owner, including assets that arrive after abort. */
export class SceneResources {
  private readonly resources = new Set<Disposable>();
  private readonly cleanups = new Set<() => void>();
  private closed = false;

  get disposed(): boolean {
    return this.closed;
  }

  own<T extends Disposable>(resource: T): T {
    if (this.closed) resource.dispose();
    else this.resources.add(resource);
    return resource;
  }

  onDispose(cleanup: () => void): void {
    if (this.closed) cleanup();
    else this.cleanups.add(cleanup);
  }

  release(resource: Disposable): void {
    if (this.resources.delete(resource)) resource.dispose();
  }

  dispose(): void {
    if (this.closed) return;
    this.closed = true;
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups.clear();
    for (const resource of this.resources) resource.dispose();
    this.resources.clear();
  }
}
