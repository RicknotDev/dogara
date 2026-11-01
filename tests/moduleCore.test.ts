// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createChangeObserver } from '../src/modules/changeObserver';
import { createModuleManager, defineModule, type ModuleContext } from '../src/modules/core';

function createTestModule(defaultEnabled = true) {
  const onEnable = vi.fn();
  const onDisable = vi.fn();
  const module = defineModule({
    id: 'test',
    name: 'Prueba',
    defaultEnabled,
    settings: { value: 1, other: 'a' },
    onEnable,
    onDisable,
  });
  return { module, onEnable, onDisable };
}

function contextOf(onEnable: ReturnType<typeof vi.fn>) {
  return onEnable.mock.calls[0]![0] as ModuleContext<{ value: number; other: string }>;
}

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe('createModuleManager', () => {
  it('activa solo los módulos que corresponden', () => {
    const on = createTestModule(true);
    const off = createTestModule(false);

    createModuleManager([on.module], {}, vi.fn()).start();
    createModuleManager([off.module], {}, vi.fn()).start();

    expect(on.onEnable).toHaveBeenCalledOnce();
    expect(off.onEnable).not.toHaveBeenCalled();
  });

  it('lo guardado tiene prioridad sobre los valores por defecto', () => {
    const { module, onEnable } = createTestModule(false);
    const stored = { test: { enabled: true, settings: { value: 2 } } };

    createModuleManager([module], stored, vi.fn()).start();

    expect(contextOf(onEnable).settings).toEqual({ value: 2, other: 'a' });
  });

  it('activar y desactivar guarda el estado y llama a cada función una vez', () => {
    const { module, onEnable, onDisable } = createTestModule();
    const save = vi.fn();
    const manager = createModuleManager([module], {}, save);
    manager.start();

    manager.setEnabled('test', false);
    manager.setEnabled('test', false);
    expect(onDisable).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.lastCall![1].enabled).toBe(false);

    manager.setEnabled('test', true);
    expect(onEnable).toHaveBeenCalledTimes(2);
  });

  it('updateSettings guarda los cambios sin perder el resto', () => {
    const { module, onEnable } = createTestModule();
    const save = vi.fn();
    createModuleManager([module], {}, save).start();

    contextOf(onEnable).updateSettings({ value: 5 });

    expect(save).toHaveBeenCalledWith('test', {
      enabled: true,
      settings: { value: 5, other: 'a' },
    });
    expect(contextOf(onEnable).settings.value).toBe(5);
  });

  it('al desactivar deshace estilos, listeners y limpiezas', () => {
    const { module, onEnable } = createTestModule();
    const manager = createModuleManager([module], {}, vi.fn());
    manager.start();

    const ctx = contextOf(onEnable);
    const cleanup = vi.fn();
    const listener = vi.fn();
    ctx.addStyle('body { color: red; }');
    ctx.onCleanup(cleanup);
    document.addEventListener('dogara-test', listener, { signal: ctx.signal });
    expect(document.head.querySelectorAll('style')).toHaveLength(1);

    manager.setEnabled('test', false);
    document.dispatchEvent(new Event('dogara-test'));

    expect(document.head.querySelectorAll('style')).toHaveLength(0);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(listener).not.toHaveBeenCalled();
  });

  it('un módulo que falla no impide que arranquen los demás', () => {
    const broken = defineModule({
      id: 'broken',
      name: 'Roto',
      defaultEnabled: true,
      settings: {},
      onEnable(ctx) {
        ctx.addStyle('body { color: red; }');
        throw new Error('falla a propósito');
      },
    });
    const { module, onEnable } = createTestModule();

    createModuleManager([broken, module], {}, vi.fn()).start();

    expect(onEnable).toHaveBeenCalledOnce();
    expect(document.head.querySelectorAll('style')).toHaveLength(0);
  });

  it('ignora módulos desconocidos', () => {
    const save = vi.fn();
    createModuleManager([], {}, save).setEnabled('nada', true);

    expect(save).not.toHaveBeenCalled();
  });
});

describe('createChangeObserver', () => {
  it('agrupa los cambios y deja de avisar al cancelar', async () => {
    const changes = createChangeObserver(document, 10);
    const callback = vi.fn();
    const unsubscribe = changes.subscribe(callback);

    document.body.append(document.createElement('div'));
    document.body.append(document.createElement('div'));
    await vi.waitFor(() => expect(callback).toHaveBeenCalledOnce());

    unsubscribe();
    document.body.append(document.createElement('div'));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(callback).toHaveBeenCalledOnce();
  });
});
