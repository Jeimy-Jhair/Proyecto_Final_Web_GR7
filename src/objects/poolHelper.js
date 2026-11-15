/**
 * Obtiene una instancia reutilizable de `ClassType` desde un grupo de Phaser.
 * Si el grupo fue creado sin `classType: ClassType`, busca un hijo inactivo
 * compatible o crea una nueva instancia usando `createFallback`.
 *
 * @template T
 * @param {Phaser.GameObjects.Group|null} group - Grupo de Phaser.
 * @param {new (...args: any[]) => T} ClassType - Clase esperada.
 * @param {() => T} createFallback - Fábrica de respaldo si el grupo no usa `classType`.
 * @param {...any} getArgs - Argumentos pasados a `group.get(...)` (p. ej. `x, y`).
 * @returns {T|null}
 */
export function acquireFromGroup(group, ClassType, createFallback, ...getArgs) {
  if (!group) {
    return createFallback();
  }

  if (group.classType === ClassType && typeof group.get === 'function') {
    return group.get(...getArgs);
  }

  if (typeof group.getChildren === 'function') {
    const inactive = group.getChildren().find((child) => child instanceof ClassType && !child.active);
    if (inactive) {
      return inactive;
    }
  }

  if (typeof group.isFull === 'function' && group.isFull()) {
    return null;
  }

  const instance = createFallback();
  if (instance && typeof group.add === 'function') {
    group.add(instance);
  }
  return instance;
}

