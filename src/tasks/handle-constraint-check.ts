import { constraints$, type Constraint, type ConstraintOption } from "../store";

export function handleConstraintCheck(constraint: Constraint, event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  constraints$.next(
    constraints$.value.map((currentConstraint) =>
      currentConstraint.id === constraint.id
        ? {
            ...currentConstraint,
            favorited: checked,
            options: currentConstraint.options.map((option) => ({
              ...option,
              selected: checked ? option.selected : false,
            })),
          }
        : currentConstraint
    )
  );
}

export function handleConstraintOptionToggle(constraint: Constraint, option: ConstraintOption) {
  constraints$.next(
    constraints$.value.map((currentConstraint) =>
      currentConstraint.id === constraint.id
        ? (() => {
            const options = currentConstraint.options.map((currentOption) =>
              currentOption.value === option.value
                ? { ...currentOption, selected: !currentOption.selected }
                : currentOption
            );

            return {
              ...currentConstraint,
              options,
              favorited: options.some((currentOption) => currentOption.selected),
            };
          })()
        : currentConstraint
    )
  );
}
