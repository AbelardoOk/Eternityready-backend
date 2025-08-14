import React from "react";
import {
  NavigationContainer,
  NavItem,
  ListNavItems,
  NavigationProps,
} from "@keystone-6/core/admin-ui/components";

export function CustomNavigation({
  lists,
  authenticatedItem,
}: NavigationProps) {
  return (
    <NavigationContainer authenticatedItem={authenticatedItem}>
      {/* Link para o Dashboard */}
      <NavItem href="/">Dashboard</NavItem>

      {/* Links para suas listas (incluindo 'Video') */}
      <ListNavItems lists={lists} />

      {/* 👇 NOSSO LINK CUSTOMIZADO PARA A PÁGINA DE VÍDEOS 👇 */}
      <NavItem href="/customListView">Videos (custom)</NavItem>
    </NavigationContainer>
  );
}
