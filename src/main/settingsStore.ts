import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { isModuleState, type ModuleState, type StoredModules } from '../shared/modules';

function readModules(filePath: string): StoredModules {
  try {
    const { modules } = JSON.parse(readFileSync(filePath, 'utf8')) as { modules?: unknown };
    if (typeof modules !== 'object' || modules === null) return {};
    return Object.fromEntries(
      Object.entries(modules).filter((entry): entry is [string, ModuleState] =>
        isModuleState(entry[1]),
      ),
    );
  } catch {
    // Sin archivo, o con un archivo dañado, la app arranca con los valores por defecto.
    return {};
  }
}

export function createSettingsStore(filePath: string) {
  const modules = readModules(filePath);

  return {
    getModules(): StoredModules {
      return modules;
    },
    setModule(id: string, state: ModuleState): void {
      modules[id] = state;
      // Se escribe primero en otro archivo: si la app se corta a mitad, no se pierde lo anterior.
      const tempPath = `${filePath}.tmp`;
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(tempPath, JSON.stringify({ modules }, null, 2));
      renameSync(tempPath, filePath);
    },
  };
}
