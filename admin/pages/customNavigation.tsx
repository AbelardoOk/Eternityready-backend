import React from "react";
import {
  NavigationContainer,
  NavItem,
  ListNavItems,
  NavigationProps,
} from "@keystone-6/core/admin-ui/components";

export default function CustomNavigation({
  lists,
  authenticatedItem,
}: NavigationProps) {
  const listOrder = ["Instagram", "Ad", "Category", "User"];
  const allowedLists = lists
    .filter((list) => listOrder.includes(list.key))
    .sort((a, b) => listOrder.indexOf(a.key) - listOrder.indexOf(b.key));
  return (
    <NavigationContainer authenticatedItem={authenticatedItem}>
      <NavItem href="/">Dashboard</NavItem>
      <hr
        style={{
          margin: "1rem 0",
          border: "1px solid #ccc",
          marginRight: "1.5rem",
        }}
      />
      <NavItem href="/customListView">Videos</NavItem>
      <ListNavItems lists={allowedLists} />
    </NavigationContainer>
  );
}
