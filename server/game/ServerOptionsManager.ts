import { useLog } from '~/composables/useLog';
import { MODEL_MAP } from '~/lib/constants';
import { deepAssign } from '~/lib/utils';
import { ModelConfig } from '~/types/Game/AI';

const log = useLog('ServerOptionsManager');

interface ServerOptions {
  gameActive: boolean;
  ModelCfg: ModelConfig;
}

let optionsManagerInstance: ServerOptionsManager | null = null;

export function useServerOptions(): ServerOptionsManager {
  if (!optionsManagerInstance) {
    optionsManagerInstance = new ServerOptionsManager();
  }
  return optionsManagerInstance;
}

export class ServerOptionsManager {
  private storage = useStorage('server-options');
  private options = { gameActive: true, ModelCfg: MODEL_MAP } as ServerOptions;

  constructor() {
    this.loadOptions();
  }

  private async loadOptions() {
    try {
      const savedOptions = await this.storage.getItem('options.json') as ServerOptions | null;
      if (savedOptions) {
        this.options = savedOptions;
      }
    } catch (e: any) {
      log.error({ _ctx: { error: e.message } }, 'Error loading server options');
    }
  }

  private async saveOptions() {
    try {
      await this.storage.setItem('options.json', this.options);
    } catch (e: any) {
      log.error({ _ctx: { error: e.message } }, 'Error saving server options');
    }
  }

  public isGameActive(): boolean {
    return this.options.gameActive;
  }

  public async setGameActive(active: boolean): Promise<void> {
    this.options.gameActive = active;
    await this.saveOptions();
  }

  public getModelConfig(): ModelConfig {
    return this.options.ModelCfg;
  }

  public async setModelConfig(config: ModelConfig): Promise<void> {
    deepAssign(this.options.ModelCfg, config);
    await this.saveOptions();
  }
}
