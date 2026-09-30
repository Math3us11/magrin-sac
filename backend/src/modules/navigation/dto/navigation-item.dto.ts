export class NavigationItemDto {
  declare children: NavigationItemDto[];
  declare code: string;
  declare iconKey: string | null;
  declare id: number;
  declare label: string;
  declare routeName: string | null;
}
