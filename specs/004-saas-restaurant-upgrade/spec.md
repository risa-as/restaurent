# Feature Specification: Restaurant SaaS Comprehensive Upgrade — Iraq Market

**Feature Branch**: `004-saas-restaurant-upgrade`
**Created**: 2026-03-23
**Status**: Draft

---

## Overview

This feature set closes all functional, competitive, and security gaps identified through a comparative analysis of the existing restaurant SaaS platform against world-class systems (Toast, Foodics, Square, Oracle MICROS). The upgrades are prioritised for the Iraqi market and organised into three delivery phases plus a security hardening track.

---

## User Scenarios & Testing

### User Story 1 — Item Modifiers & Variants (Priority: P1)

A captain takes a dine-in order for a burger. The customer wants it medium-well, extra cheese, no pickles, with a large size upgrade. The captain selects the item, is prompted with modifier groups, makes selections, and the order is sent to the kitchen with all customisations printed on the ticket.

**Why this priority**: Without modifiers, restaurants cannot accurately represent their menu or fulfil custom orders — every serious restaurant requires this before going live.

**Independent Test**: Create a menu item with two modifier groups (required + optional). Place an order selecting modifiers. Verify the kitchen ticket and customer receipt both display selected modifiers with correct pricing.

**Acceptance Scenarios**:

1. **Given** a menu item has a required modifier group (e.g. "Size"), **When** a cashier adds the item to an order, **Then** the system blocks submission until a size is selected.
2. **Given** a modifier has a price (e.g. "Extra Cheese +1,500 IQD"), **When** the modifier is selected, **Then** the order total increases by that amount.
3. **Given** an order is confirmed, **When** the kitchen ticket is generated, **Then** each modifier selected is listed under the item on the ticket.
4. **Given** a modifier group has min=0 max=3, **When** a user selects 4 options, **Then** the system prevents the 4th selection and shows an informative message.

---

### User Story 2 — QR Self-Ordering (Priority: P1)

A customer sits at table 7, scans the QR code on the table, sees the full menu in Arabic with photos and prices, adds items (with modifiers), submits the order, and watches it move from "قيد التحضير" to "جاهز". They then tap "اطلب الفاتورة" when done.

**Why this priority**: Reduces staffing cost, increases order accuracy, and is now an expected feature in post-COVID dining.

**Independent Test**: Scan a table QR code on a mobile browser. Place a full order with modifiers. Confirm the order appears in the captain dashboard and kitchen board without any staff involvement.

**Acceptance Scenarios**:

1. **Given** a customer scans a table QR code, **When** the page loads, **Then** the full menu is shown in Arabic with images, prices, and categories — no login required.
2. **Given** a customer submits an order, **When** the order is placed, **Then** it appears in the captain/kitchen interface within 3 seconds.
3. **Given** an existing open order for a table, **When** the customer scans the QR again, **Then** they can add more items to the existing order.
4. **Given** a customer taps "اطلب الفاتورة", **When** the request is sent, **Then** the captain/cashier is notified that table N requests the bill.
5. **Given** the customer's order changes status to READY, **When** the status updates, **Then** the customer's tracking page reflects the new status without a page reload.

---

### User Story 3 — Password Reset Flow (Priority: P1)

A waiter forgot their password on a busy shift. They tap "نسيت كلمة المرور" on the login page, enter their registered email, receive a reset email within 2 minutes, click the link, set a new password, and log in — all without needing the admin to intervene.

**Why this priority**: A critical security gap; every production system requires self-service password recovery.

**Independent Test**: Trigger a password reset for a test account. Verify email is received, link expires after 30 minutes, and new password works for login.

**Acceptance Scenarios**:

1. **Given** a user with a valid email requests a reset, **When** they submit the form, **Then** a reset email arrives within 2 minutes.
2. **Given** a reset link, **When** it is used more than 30 minutes after generation, **Then** it is rejected with an informative message.
3. **Given** a reset link is used once successfully, **When** the same link is used again, **Then** it is rejected (single-use tokens).
4. **Given** a password is changed, **When** the change is complete, **Then** the user receives a confirmation email notifying them of the change.
5. **Given** an email that does not exist in the system, **When** a reset is requested, **Then** the system shows a generic success message (no enumeration).

---

### User Story 4 — Offline Mode (Priority: P1)

The internet goes down during a busy lunch service. The cashier and captain continue taking orders normally. When connectivity is restored, all queued orders sync automatically. A visible banner indicates offline/online status throughout.

**Why this priority**: Iraq experiences frequent internet outages; a system that stops working when internet drops is not viable for the local market.

**Independent Test**: Disconnect the device from the internet. Take 3 orders through the cashier and captain interfaces. Reconnect. Verify all 3 orders appear in the system with correct timestamps.

**Acceptance Scenarios**:

1. **Given** the device is offline, **When** a cashier creates an order, **Then** the order is saved locally and a visual indicator shows it is pending sync.
2. **Given** connectivity is restored, **When** the sync runs, **Then** all pending orders are submitted in the correct sequence and the pending queue is cleared.
3. **Given** the app is offline, **When** the user opens the cashier or captain interface, **Then** the existing menu data is available from cache.
4. **Given** a conflict exists (same table ordered from two devices), **When** syncing, **Then** the system uses last-write-wins and logs the conflict for manager review.

---

### User Story 5 — Split Bill (Priority: P2)

Four colleagues finish dinner. Two want to pay cash, one by card, one wants to pay only for their own items. The cashier opens the split-bill screen, assigns items to guests or splits equally, processes each payment separately, and closes the order.

**Why this priority**: Standard requirement for table-service restaurants; increases customer satisfaction and reduces post-meal disputes.

**Independent Test**: Create a table order with 6 items. Split by items (3+3). Process payment for each half separately. Verify both bills total correctly to the original order total.

**Acceptance Scenarios**:

1. **Given** an order has 6 items, **When** split equally among 2 guests, **Then** each sub-bill contains 3 items and the totals sum to the original.
2. **Given** a split bill, **When** one portion is paid, **Then** the remaining portion stays open and the order is not closed until all portions are settled.
3. **Given** a split bill with unequal items, **When** each portion is paid with a different method, **Then** the system records each payment method separately.

---

### User Story 6 — Shift Management (Priority: P2)

A cashier starts their morning shift by opening a shift with IQD 50,000 starting cash. Throughout the shift all sales are recorded against that shift. At end of day they close the shift, enter the physical cash count, and the system generates a shift report showing expected vs actual cash.

**Why this priority**: Essential for cash accountability; prevents shrinkage and provides per-shift performance data.

**Independent Test**: Open a shift, process 5 orders (mix of cash and card), close the shift with correct cash count. Verify shift report shows correct totals per payment method and cash variance is zero.

**Acceptance Scenarios**:

1. **Given** no open shift exists, **When** a cashier tries to process a payment, **Then** the system prompts them to open a shift first.
2. **Given** an open shift, **When** orders are processed, **Then** all transactions are linked to that shift.
3. **Given** a cashier closes a shift, **When** they enter the physical cash count, **Then** the system calculates and displays the variance (expected vs counted).
4. **Given** a shift is closed, **When** an accountant views shift history, **Then** they can see all shifts with totals, variances, and the cashier name.

---

### User Story 7 — Purchase Orders & Stock Expiry (Priority: P2)

The store manager creates a purchase order for 50 kg of chicken from a supplier, sets a price per kg, and marks an expected delivery date. When the delivery arrives, they receive it in the system and record the batch expiry date. 3 days before expiry, the system alerts the manager.

**Why this priority**: Closes a critical food-safety gap (no expiry tracking) and formalises the procurement workflow.

**Independent Test**: Create a PO, receive it with an expiry date 5 days out, advance the system clock to T-3, verify an expiry alert appears.

**Acceptance Scenarios**:

1. **Given** a PO is created and approved, **When** goods are received, **Then** stock level increases by the received quantity.
2. **Given** a batch has an expiry date, **When** the date is 7 days or 3 days away, **Then** the store manager receives a dashboard alert.
3. **Given** multiple batches of the same material, **When** inventory is consumed, **Then** the oldest batch (by expiry date) is consumed first (FIFO).
4. **Given** a material has expired batches, **When** a manager views inventory, **Then** expired batches are flagged in red and excluded from available stock.

---

### User Story 8 — Customer Delivery Tracking (Priority: P2)

A customer places a delivery order by phone. The staff creates the order and assigns a driver. The system sends the customer a WhatsApp/SMS message with a tracking link. The customer opens it, sees the driver's live location on a map, the order stages (preparing → on the way → delivered), and an estimated arrival time.

**Why this priority**: Eliminates "where is my order?" calls; differentiates from manual delivery management.

**Independent Test**: Create a delivery order, assign driver, open the public tracking link in an incognito browser, verify driver location updates and status stages are visible without login.

**Acceptance Scenarios**:

1. **Given** a delivery order is created, **When** a driver is assigned, **Then** a unique public tracking URL is generated and stored with the delivery record.
2. **Given** a driver updates their location, **When** a customer views the tracking page, **Then** the driver's position on the map updates within 5 seconds.
3. **Given** the delivery status changes to DELIVERED, **When** the customer views tracking, **Then** the page shows a "تم التوصيل" confirmation state.
4. **Given** the tracking link, **When** accessed without any authentication, **Then** only the delivery status and driver location are visible — no other order or customer data.

---

### User Story 9 — Two-Factor Authentication (Priority: P2)

An ADMIN enables 2FA from their security settings. They scan a QR code into Google Authenticator, verify a code to confirm setup, and receive 8 backup codes. On next login, after entering their password, they are prompted for a 6-digit TOTP code.

**Why this priority**: Protects high-privilege accounts from credential theft — critical for a multi-tenant SaaS where one compromised admin could affect all their restaurant data.

**Independent Test**: Enable 2FA on an admin account. Log out. Log in — verify the system requires a TOTP code after the correct password.

**Acceptance Scenarios**:

1. **Given** 2FA is enabled, **When** the user logs in with correct credentials, **Then** a second screen prompts for a TOTP code before granting access.
2. **Given** an incorrect TOTP code, **When** submitted, **Then** access is denied and an attempt is logged.
3. **Given** a SUPER_ADMIN account without 2FA, **When** they log in, **Then** the system forces the 2FA setup flow before proceeding.
4. **Given** a user has lost their authenticator, **When** they enter a valid backup code, **Then** they gain access and the backup code is consumed (single-use).

---

### User Story 10 — Talabat Integration (Priority: P2)

The restaurant is registered on Talabat. When a customer places an order on Talabat, it automatically appears in the restaurant POS as a new order — no manual re-entry. When the order status changes in the POS, Talabat is notified automatically. The menu syncs from the POS to Talabat with one click.

**Why this priority**: Talabat is the dominant food-delivery platform in Iraq; manual re-entry of Talabat orders is error-prone and time-consuming.

**Independent Test**: Simulate a Talabat webhook payload. Verify a new order appears in the POS. Change its status. Verify Talabat's status endpoint is called with the updated status.

**Acceptance Scenarios**:

1. **Given** a valid Talabat webhook payload is received, **When** the webhook fires, **Then** a corresponding order is created in the POS within 10 seconds.
2. **Given** a POS order originated from Talabat, **When** its status changes, **Then** the system calls the Talabat status update API.
3. **Given** a manager triggers menu sync, **When** the sync completes, **Then** all available items and prices are reflected on the Talabat platform.
4. **Given** a Talabat webhook with an invalid signature, **When** received, **Then** the system rejects it with a 401 and logs the attempt.

---

### User Story 11 — Kitchen Stations / KDS (Priority: P3)

A large restaurant has four stations: grill, fryer, cold, and beverages. Each station has its own screen. When an order arrives, items are routed to the correct station. The grill chef only sees grill items; the beverage station only sees drinks. Each station can mark their items as done independently.

**Why this priority**: Required for larger/busier kitchens to reduce confusion and improve throughput.

**Independent Test**: Assign menu items to two different stations. Place an order containing both. Open each station screen. Verify each only shows its assigned items.

**Acceptance Scenarios**:

1. **Given** items are assigned to a station, **When** an order is placed containing those items, **Then** only those items appear on that station's screen.
2. **Given** a station marks an item as done, **When** all stations have completed their items for an order, **Then** the order status automatically advances to READY.
3. **Given** an item takes longer than its estimated prep time, **When** the timer expires, **Then** the item is highlighted in red on the station screen.

---

### User Story 12 — Digital Menu Boards (Priority: P3)

A QSR (Quick Service Restaurant) has two TV screens at the counter. The manager opens the digital menu board URL on the TV browser. The menu is displayed full-screen with categories, items, prices, and availability. When an item sells out, it disappears from the screen within seconds.

**Why this priority**: Professional presentation and operational efficiency — eliminates outdated printed menus.

**Independent Test**: Open the menu board URL. Mark an item as unavailable in the admin panel. Verify it disappears from the board within 10 seconds without refreshing.

**Acceptance Scenarios**:

1. **Given** the menu board URL is opened, **When** displayed, **Then** all available items are shown with current prices in a TV-optimised layout.
2. **Given** an item is toggled unavailable in the POS, **When** up to 10 seconds pass, **Then** the item is removed from the board display.
3. **Given** a "night menu" schedule is configured, **When** the configured time arrives, **Then** the board automatically switches to the night menu.

---

### User Story 13 — Kurdish Language Support (Priority: P3)

A restaurant in Erbil onboards to the platform. The admin selects Sorani Kurdish as the default language. All staff see the interface in Kurdish (RTL). The menu items have Kurdish name fields. The customer-facing QR ordering page also renders in Kurdish.

**Why this priority**: Opens the entire Kurdistan Region market — a significant untapped segment.

**Independent Test**: Switch user language to Kurdish. Verify all UI labels, navigation, and buttons are in Sorani Kurdish. Verify RTL rendering is correct.

**Acceptance Scenarios**:

1. **Given** a user selects Kurdish as their language, **When** they reload the interface, **Then** all UI elements are displayed in Sorani Kurdish with correct RTL layout.
2. **Given** a menu item has a Kurdish name entered, **When** the customer menu is viewed in Kurdish, **Then** the Kurdish name is displayed.
3. **Given** a tenant selects Kurdish as default, **When** the QR ordering page loads, **Then** it defaults to Kurdish.

---

### User Story 14 — Customer Feedback / NPS (Priority: P3)

After completing a dine-in meal, the QR ordering page shows a "كيف كانت تجربتك؟" prompt. The customer taps 4 stars and writes a short comment. If the rating is 5 stars, a prompt appears suggesting they leave a Google Review. The restaurant manager sees an NPS dashboard with average scores and recent comments.

**Why this priority**: Reputation management and quality improvement data; 5-star routing to Google Reviews improves online visibility.

**Independent Test**: Complete a QR order. After status reaches COMPLETED, verify the feedback prompt appears. Submit feedback. Verify it appears in the manager's feedback dashboard.

**Acceptance Scenarios**:

1. **Given** an order is completed via QR, **When** the customer views the tracking page, **Then** a star-rating prompt appears.
2. **Given** a customer submits a 5-star rating, **When** confirmed, **Then** a Google Reviews redirect prompt appears.
3. **Given** feedback is submitted, **When** a manager views the feedback dashboard, **Then** they see the rating, comment, order reference, and timestamp.

---

### User Story 15 — Seasonal / Ramadan Menus (Priority: P3)

The restaurant creates a "قائمة رمضان" with special iftar and suhoor packages. They schedule it to activate on the first day of Ramadan and deactivate on Eid. During Ramadan, the menu automatically switches and the operating hours extend to 3 AM for suhoor delivery.

**Why this priority**: Ramadan is the most commercially significant period for Iraqi restaurants; automated scheduling reduces operational errors.

**Independent Test**: Create a scheduled menu with start/end dates. Advance the system clock past the start date. Verify the seasonal menu becomes active without manual intervention.

**Acceptance Scenarios**:

1. **Given** a seasonal menu with a start date, **When** that date arrives, **Then** the menu activates automatically and replaces the default menu.
2. **Given** a seasonal menu's end date has passed, **When** the system checks, **Then** the default menu is restored automatically.
3. **Given** Ramadan operating hours are configured, **When** the Ramadan menu is active, **Then** delivery orders respect the extended hours.

---

### User Story 16 — Consolidated Branch Reports (Priority: P3)

A restaurant chain owner has 4 branches. From the dashboard, they select "تقرير موحد" and see a side-by-side comparison of all branches: total revenue, number of orders, average order value, and top-selling item. They can export the consolidated report to Excel.

**Why this priority**: Multi-branch owners need a single view to manage their portfolio; currently they must check each branch individually.

**Independent Test**: Seed data for 3 branches with different sales volumes. Open consolidated report. Verify correct aggregation and that the correct branch is ranked #1 by revenue.

**Acceptance Scenarios**:

1. **Given** a tenant has multiple branches, **When** viewing the consolidated report, **Then** each branch's revenue, order count, and average order value are displayed.
2. **Given** a date range is selected, **When** the report generates, **Then** all figures reflect only orders within that range across all branches.
3. **Given** a manager exports the report, **When** the Excel file downloads, **Then** it contains one row per branch plus a totals row.

---

### User Story 17 — Security Hardening (Priority: P1)

A security audit is conducted. Postgres RLS prevents cross-tenant data leaks even if application-level tenant checks are bypassed. CSP headers block injected scripts. Financial operations (void, refund, expense approval) require supervisor confirmation. Failed login attempts are rate-limited and logged. Sessions expire after 8 hours of inactivity.

**Why this priority**: Multi-tenant SaaS platforms are high-value targets; security hardening is a prerequisite for enterprise customers and regulatory compliance.

**Independent Test**: Attempt to query another tenant's orders by manipulating the tenantId in a direct DB call — verify RLS blocks it. Submit an XSS payload in a menu item name — verify it is not executed. Attempt 15 failed logins — verify the account is temporarily locked.

**Acceptance Scenarios**:

1. **Given** a database query runs without application-level tenant filtering, **When** Postgres RLS is enabled, **Then** only rows belonging to the authenticated tenant's context are returned.
2. **Given** an XSS payload in user-generated content, **When** the page renders, **Then** the script is not executed due to CSP headers.
3. **Given** a cashier attempts to void an order, **When** no supervisor approval is present, **Then** the system blocks the action and requests manager confirmation.
4. **Given** 10 consecutive failed login attempts, **When** the 11th attempt is made, **Then** the account is locked for 15 minutes and an alert is sent to the admin.
5. **Given** a session that has been idle for 8 hours, **When** the user attempts any action, **Then** they are redirected to the login page.

---

### Edge Cases

- What happens when a modifier group is required but the item is added programmatically (e.g. from Talabat webhook)? → Default to first option or leave unspecified with a kitchen note.
- What happens when a QR order is placed for a table that has been closed/cleaned? → Show an error and prompt customer to ask staff.
- What happens when offline orders sync but the table was already closed by another device? → Log a conflict, create the order as a new order on the same table, notify manager.
- What happens when a seasonal menu's start date is in the past at creation time? → Activate immediately.
- What happens when a branch has zero orders in the consolidated report date range? → Show the branch with all zero values rather than omitting it.
- What happens when a reset link email bounces? → No user-facing indication (prevent enumeration); log the bounce internally.
- What happens when Talabat sends a duplicate webhook for the same order? → Idempotency check — no duplicate order created.
- What happens when a KDS station goes offline? → Items remain in the main kitchen board as fallback; station reconnects and re-syncs.

---

## Requirements

### Functional Requirements

**Modifiers & Variants**
- **FR-001**: System MUST allow creation of modifier groups with a name, selection type (single/multi), and min/max selection constraints.
- **FR-002**: System MUST allow each modifier option to carry an additional price (can be zero).
- **FR-003**: System MUST support item variants as a special modifier group where each option represents a distinct price point.
- **FR-004**: System MUST enforce required modifier groups before allowing an order item to be submitted.
- **FR-005**: System MUST display modifier selections on kitchen tickets and customer receipts.
- **FR-006**: System MUST allow modifier options to be linked to raw material adjustments for inventory tracking.

**QR Self-Ordering**
- **FR-007**: System MUST generate a unique QR code per table that encodes the tenant slug and table ID.
- **FR-008**: System MUST provide a public, unauthenticated customer ordering page accessible by scanning the QR code.
- **FR-009**: System MUST allow customers to browse the menu, add/remove items with modifiers, and submit orders.
- **FR-010**: System MUST push incoming QR orders to the captain/kitchen interface in real time.
- **FR-011**: System MUST allow customers to view their order status in real time after submission.
- **FR-012**: System MUST allow customers to request the bill from the ordering page.
- **FR-013**: System MUST identify a customer session by table + session token (no account required).

**Password Reset**
- **FR-014**: System MUST provide a "Forgot Password" entry point on the login page.
- **FR-015**: System MUST send a time-limited (30-minute), single-use reset token to the user's registered email.
- **FR-016**: System MUST allow the user to set a new password after validating the token.
- **FR-017**: System MUST send a confirmation email after a successful password change.
- **FR-018**: System MUST NOT reveal whether an email address is registered (anti-enumeration).

**Offline Mode**
- **FR-019**: System MUST cache the menu and essential UI assets for offline use via a Service Worker.
- **FR-020**: System MUST queue orders created while offline in local storage (IndexedDB).
- **FR-021**: System MUST automatically sync queued orders when connectivity is restored.
- **FR-022**: System MUST display a persistent online/offline status indicator.
- **FR-023**: System MUST resolve sync conflicts using last-write-wins and log conflicts for manager review.

**Split Bill**
- **FR-024**: System MUST allow a cashier to split a table order into two or more sub-bills.
- **FR-025**: System MUST support splitting equally or by item assignment.
- **FR-026**: System MUST allow each sub-bill to be settled with a different payment method.
- **FR-027**: System MUST keep the parent order open until all sub-bills are settled.

**Shift Management**
- **FR-028**: System MUST require cashiers to open a shift with a starting cash amount before processing payments.
- **FR-029**: System MUST link all transactions during a shift to the open shift record.
- **FR-030**: System MUST generate a shift closing report with totals per payment method and cash variance.
- **FR-031**: System MUST maintain a complete shift history viewable by accountants.

**Purchase Orders & Stock Expiry**
- **FR-032**: System MUST allow store managers to create purchase orders linked to a supplier with line items and expected delivery date.
- **FR-033**: System MUST allow goods receipt against a PO, updating stock levels and recording batch expiry dates.
- **FR-034**: System MUST alert store managers when a batch is within 3 or 7 days of expiry.
- **FR-035**: System MUST consume stock using FIFO order (oldest expiry first).
- **FR-036**: System MUST display expired batches separately and exclude them from available stock calculations.

**Customer Delivery Tracking**
- **FR-037**: System MUST generate a unique public tracking URL for each delivery order upon driver assignment.
- **FR-038**: System MUST display the driver's live location on a map on the public tracking page.
- **FR-039**: System MUST show order stage progression (received → preparing → on the way → delivered) on the tracking page.
- **FR-040**: System MUST display an estimated delivery time on the tracking page.
- **FR-041**: System MUST restrict the public tracking page to delivery status and driver location only (no PII beyond what is needed).

**2FA**
- **FR-042**: System MUST support TOTP-based 2FA for ADMIN and SUPER_ADMIN roles.
- **FR-043**: System MUST enforce 2FA setup on first login for SUPER_ADMIN accounts.
- **FR-044**: System MUST generate single-use backup codes during 2FA setup.
- **FR-045**: System MUST allow account recovery via a valid backup code.

**Talabat Integration**
- **FR-046**: System MUST accept and validate inbound webhooks from Talabat using signature verification.
- **FR-047**: System MUST create a POS order from a validated Talabat webhook payload, idempotently.
- **FR-048**: System MUST push POS order status updates to Talabat's API when relevant status changes occur.
- **FR-049**: System MUST support one-click menu synchronisation from POS to Talabat.

**Kitchen Stations (KDS)**
- **FR-050**: System MUST allow tenants to define kitchen stations with a name and assigned colour.
- **FR-051**: System MUST allow menu items to be assigned to one or more stations.
- **FR-052**: System MUST provide a per-station order display showing only items for that station.
- **FR-053**: System MUST advance an order to READY automatically when all stations have completed their items.
- **FR-054**: System MUST highlight items that exceed their estimated prep time.

**Digital Menu Boards**
- **FR-055**: System MUST provide a public, unauthenticated menu board URL per tenant.
- **FR-056**: System MUST update the menu board display within 10 seconds of any menu change.
- **FR-057**: System MUST support a scheduled "night menu" that activates and deactivates at configured times.

**Kurdish Language**
- **FR-058**: System MUST support Sorani Kurdish (ku) as a selectable language alongside Arabic (ar) and English (en).
- **FR-059**: System MUST render the Kurdish interface in RTL layout.
- **FR-060**: System MUST allow menu item names and category names to be entered in three languages.
- **FR-061**: System MUST allow each user to select their preferred language independently.

**Customer Feedback / NPS**
- **FR-062**: System MUST prompt QR-ordering customers for a rating after their order is marked COMPLETED.
- **FR-063**: System MUST record ratings (1–5 stars) and optional text comments linked to the order.
- **FR-064**: System MUST redirect 5-star raters to the restaurant's Google Reviews page (if configured).
- **FR-065**: System MUST provide a feedback dashboard showing average score, trend, and recent comments.

**Seasonal / Ramadan Menus**
- **FR-066**: System MUST allow creation of named seasonal menus with a start date, end date, and active flag.
- **FR-067**: System MUST automatically activate a seasonal menu when its start date arrives.
- **FR-068**: System MUST restore the default menu automatically when a seasonal menu's end date passes.
- **FR-069**: System MUST allow seasonal operating hours to override default hours during the active period.

**Consolidated Branch Reports**
- **FR-070**: System MUST provide a consolidated report view showing all branches' performance side by side.
- **FR-071**: System MUST support date-range filtering on the consolidated report.
- **FR-072**: System MUST export the consolidated report to Excel (XLSX) format.

**Security Hardening**
- **FR-073**: System MUST implement PostgreSQL Row-Level Security (RLS) policies for all tenant-scoped tables.
- **FR-074**: System MUST set Content Security Policy (CSP) response headers on all pages.
- **FR-075**: System MUST define explicit CORS allowed-origins for all API routes.
- **FR-076**: System MUST log all financial operations (void, refund, expense create/edit/delete) with before/after values in the audit log.
- **FR-077**: System MUST require supervisor-role approval for void and refund actions.
- **FR-078**: System MUST lock accounts for 15 minutes after 10 consecutive failed login attempts and alert the tenant admin.
- **FR-079**: System MUST expire sessions after 8 hours of inactivity and require re-authentication.

---

### Key Entities

- **ModifierGroup**: A named set of options attached to a menu item (e.g. "Size", "Extras"). Has selection type (single/multi), min, max, and a required flag.
- **ModifierOption**: A single choice within a group with a name, additional price, and optional raw-material link.
- **OrderItemModifier**: Junction between an OrderItem and selected ModifierOptions; stores the applied price at time of order.
- **PasswordResetToken**: A hashed one-time token linked to a User with an expiry timestamp.
- **OfflineOrder**: Local-only transient record stored in IndexedDB; not a DB model — synced and converted to Order on reconnect.
- **CashierShift**: Records shift open/close times, starting cash, cashier, branch, and aggregated totals per payment method.
- **PurchaseOrder**: Formal request to a Supplier for raw materials; has status (DRAFT, SENT, RECEIVED, CANCELLED) and line items.
- **PurchaseOrderItem**: A line of a PO: raw material, ordered quantity, unit cost.
- **InventoryBatch**: A received batch of a raw material with quantity, cost, expiry date, and PO reference.
- **DeliveryTrackingToken**: A hashed public token linked to a Delivery record; used to access the public tracking page.
- **TwoFactorSetup**: TOTP secret and backup codes (hashed) linked to a User; tracks whether 2FA is enabled and verified.
- **TalabatConfig**: Per-tenant Talabat integration credentials (API key, store ID, webhook secret).
- **TalabatOrder**: Links a POS Order to its originating Talabat order ID; used for idempotency and status sync.
- **KitchenStation**: Named station (e.g. "Grill") with colour, linked to a Branch.
- **MenuItemStation**: Junction between MenuItem and KitchenStation.
- **SeasonalMenu**: Named menu schedule with start/end dates; references a set of active CategoryIds or MenuItemIds.
- **CustomerFeedback**: Rating (1–5), optional comment, linked to an Order, with tenant and branch context.
- **Language**: Enum: AR, KU, EN — used on User and Tenant preferences.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Staff can create a modifier group and apply it to an item in under 2 minutes; 100% of kitchen tickets display selected modifiers correctly.
- **SC-002**: A customer can scan a QR code, browse the menu, place an order, and receive kitchen acknowledgment in under 90 seconds.
- **SC-003**: A user can complete the password reset flow (request → email → new password set) in under 5 minutes; reset links expire exactly at 30 minutes.
- **SC-004**: During a simulated internet outage, 100% of orders created offline are successfully synced within 60 seconds of connectivity restoration.
- **SC-005**: Split-bill processing reduces table-turn time by eliminating the need for manual cash splitting; all sub-bill totals sum correctly to the parent order total (zero rounding error).
- **SC-006**: Shift reports show zero discrepancy between system-recorded cash sales and cashier-entered cash count when no manual errors are made.
- **SC-007**: Inventory managers receive expiry alerts for 100% of batches entering the 7-day and 3-day warning windows; FIFO consumption order is correct in 100% of automated stock deductions.
- **SC-008**: Delivery tracking page loads in under 3 seconds; driver location updates within 5 seconds of the driver's device reporting a new position.
- **SC-009**: 2FA-enabled login adds no more than 20 seconds to the authentication flow; 0% of backup codes are reusable after first use.
- **SC-010**: Talabat orders appear in the POS within 10 seconds of webhook receipt; duplicate webhooks produce zero duplicate orders.
- **SC-011**: Each kitchen station displays only its assigned items; an order advances to READY within 5 seconds of all stations completing their items.
- **SC-012**: Menu board updates are reflected within 10 seconds of a menu change.
- **SC-013**: Kurdish interface achieves full RTL rendering with zero overlapping or misaligned UI elements in standard viewports.
- **SC-014**: Feedback collection rate of at least 20% of completed QR orders (industry baseline for in-app prompts).
- **SC-015**: Seasonal menus activate and deactivate automatically with zero manual intervention and within 60 seconds of the scheduled time.
- **SC-016**: Consolidated branch report generates in under 5 seconds for a tenant with up to 10 branches and 90 days of data.
- **SC-017**: Zero cross-tenant data leaks detectable via automated penetration test; CSP headers block 100% of reflected XSS payloads in test suite; 100% of financial void/refund actions are logged with before/after values.

---

## Assumptions

1. Talabat provides a standard REST webhook API with HMAC signature verification. If Talabat's API differs significantly, the integration scope may need adjustment.
2. WhatsApp/SMS notifications for delivery tracking will use a third-party gateway (e.g. Twilio or a local Iraqi SMS provider). The specific provider is not in scope for this spec.
3. "Night menu" scheduling for Digital Menu Boards uses the restaurant's configured timezone (Baghdad, UTC+3).
4. The Sorani Kurdish locale uses the same Arabic-Indic numerals common in Iraqi Kurdish media.
5. Google Reviews integration for NPS is optional per tenant; it requires the tenant to configure their Google Place ID.
6. Offline mode targets the cashier and captain interfaces only; the admin dashboard and reports remain online-only.
7. FIFO inventory consumption applies at the raw-material batch level, not at the prepared-food level.
8. Session expiry (8 hours inactivity) applies to all roles. SUPER_ADMIN sessions may be configured for a shorter duration in platform settings.
9. The consolidated branch report is available to ADMIN, MANAGER, and ACCOUNTANT roles only.
10. Ramadan start/end dates are entered manually by the tenant admin (no automatic Hijri calendar integration is required in this phase).
