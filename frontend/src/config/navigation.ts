import type { NavigationItem } from '@/types/navigation'

/**
 * Mantém apenas os itens que o frontend consegue abrir. O menu vem do banco e pode
 * chegar antes da rota correspondente (migration aplicada antes do deploy do frontend);
 * nesse caso o item é ignorado em vez de quebrar a renderização do shell. Agrupadores
 * continuam visíveis somente quando ainda possuem ao menos um filho.
 */
export function filterRoutableNavigation(
  items: NavigationItem[],
  hasRoute: (routeName: string) => boolean,
  onUnknownRoute: (routeName: string) => void = () => {},
): NavigationItem[] {
  return items.flatMap((item) => {
    if (item.routeName !== null) {
      if (hasRoute(item.routeName)) return [item]
      onUnknownRoute(item.routeName)
      return []
    }

    const children = filterRoutableNavigation(item.children, hasRoute, onUnknownRoute)
    return children.length > 0 ? [{ ...item, children }] : []
  })
}
