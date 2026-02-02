import { Table, Order, OrderItem, MenuItem } from '@prisma/client';

export type ExtendedTable = Table & {
    orders?: (Order & {
        items: (OrderItem & {
            menuItem: MenuItem
        })[]
    })[]
};
