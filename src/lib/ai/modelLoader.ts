import { loadCompanionConfig } from '../companion/companionConfig';
import { memoryManager } from '../optimization/memoryManager';

const RAM_REQUIRED: Record<string, number> = {
  'phi3:mini': 600 * 1024 * 1024,
  'phi3:mini-q4': 300 * 1024 * 1024,
  'phi3:latest': 3000 * 1024 * 1024,
  'llava:7b': 4500 * 1024 * 1024,
};

class ModelLoaderImpl {
  private loaded = new Set<string>();

  isLoaded(name: string) {
    return this.loaded.has(name);
  }

  getRAMRequired(name: string): number {
    return RAM_REQUIRED[name] ?? 1_000 * 1024 * 1024;
  }

  getAvailableRAM(): number {
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } })
      .memory;
    if (!mem) return 2_000_000_000;
    return mem.jsHeapSizeLimit - mem.usedJSHeapSize;
  }

  async getModel(name: string, complexity = 5): Promise<string> {
    const routed = memoryManager.selectOptimalModel(complexity);
    const pick = name === 'auto' ? routed : name;

    if (this.isLoaded(pick)) return pick;

    const required = this.getRAMRequired(pick);
    if (required > this.getAvailableRAM()) {
      return 'cloud';
    }

    // Models are served by Ollama externally — mark logical load
    this.loaded.add(pick);
    return pick;
  }

  unloadModel(name: string) {
    this.loaded.delete(name);
  }

  defaultChatModel(): string {
    const cfg = loadCompanionConfig();
    return cfg.llmModel || 'phi3:mini';
  }
}

export const modelLoader = new ModelLoaderImpl();
