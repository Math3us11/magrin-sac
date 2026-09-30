import { NavigationItemDto } from './navigation-item.dto.js';

export class NavigationResponseDto {
  declare items: NavigationItemDto[];
  declare permissions: string[];
}
