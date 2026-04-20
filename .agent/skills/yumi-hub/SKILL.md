---
name: Yumi Hub Security & Scalability Standard
description: Mandatory architecture, security, and design guidelines for tactical POS systems in the Yumi ecosystem.
---

# Yumi Hub Security & Scalability Standard

This skill defines the mandatory implementation of the **LicenseGuard Elite Pro (v2)** system and the **Scalable Omnichannel Architecture** for all client projects.

## 1. Multi-Platform & Deployment Strategy (Omnichannel)

All projects must be designed to run seamlessly across multiple environments from a single codebase:
- **Desktop (Primary)**: Use **Tauri v2** for secure, high-performance native applications (Windows/macOS/Linux).
- **Web (PWA)**: Ensure full responsiveness and capability to run as a Progressive Web App for remote management.
- **Mobile (iOS/Android)**: Maintain compatibility for mobile deployment using Tauri's native mobile support or optimized web views.
- **Design Philosophy**: One core logic, multiple high-end interfaces adapted to each device.

## 2. Security Architecture (LicenseGuard Elite Pro v2)

Every project MUST wrap the root application in the `LicenseGuard` component.

### Core Requirements:
- **Unified Sync**: Licenses and notifications must be verified via a single POST request to the Hub (`/api/verify`) every 15-20 minutes.
- **Fail-Safe Logic**: If the local license expires, provide a **"Sync Now" (Vérifier mon abonnement)** trigger to detect Hub-side renewals without a restart.
- **Fraud Detection**: Active monitoring for Clock Fraud (negative time drift) and mandatory offline sync constraints (30-day grace period).

## 3. Distributed Network Architecture

Projects must be ready to scale from a single computer to a multi-machine environment:
- **Centralized Database**: Capability to use a shared PostgreSQL/Supabase instance or a local primary server (Server + Multiple Clients).
- **Local Network Support**: The app must handle local IP communication for POS peripherals (printers, scanners) while maintaining Hub sync.
- **Remote Access (Admin)**: Administrators must be able to access the dashboard/management tools remotely, even if the primary local installation is offline.

## 4. Integration-Ready Design

Build systems that expect to grow:
- **Module Extensibility**: Design the codebase using the "Plugin" pattern or clear separation of concerns (common/ modules).
- **API Readiness**: Always expose or be prepared to consume REST/Webhook interfaces for 3rd party integrations (Delivery apps, inventory sync, etc.).
- **Global Branding**: Control visual identity via `.env` tokens (`VITE_ACCENT_COLOR`, `VITE_FONT_SANS`, etc.) for instant white-labeling.

## 5. Universal Hardware Identification (HWID)

Hardware locking must be absolute:
1. **WMIC UUID** (Motherboard/BIOS)
2. **MachineGuid** (Windows Cryptography Key)
3. **Hardware Fallback** (Fallback to persistent hashed identifiers)

---
*Yumi Alliance Standard — v2.1 — 2026 Edition*
