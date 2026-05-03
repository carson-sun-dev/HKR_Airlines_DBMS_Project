import { useState } from "react";
import { CustomerBlock } from "./staff/blocks/CustomerBlock";
import { AutoInsuranceBlocks } from "./staff/blocks/AutoInsuranceBlocks";
import { HomeInsuranceBlocks } from "./staff/blocks/HomeInsuranceBlocks";
import { PropertyBlocks } from "./staff/blocks/PropertyBlocks";
import { DriverBlocks } from "./staff/blocks/DriverBlocks";

const TABS = [
  { id: "customer", label: "Customers" },
  { id: "auto", label: "Auto" },
  { id: "home", label: "Home" },
  { id: "property", label: "Property" },
  { id: "driver", label: "Drivers" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function StaffWorkspace() {
  const [tab, setTab] = useState<TabId>("customer");

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="card" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.35rem", color: "var(--text)" }}>Policy administration</h1>
        <p className="card-muted" style={{ margin: 0 }}>
          Search by record ID, then expand a section to create, update, or remove entries. Authorized employee accounts only.
        </p>
      </div>

      <div className="tabs-row">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "customer" ? <CustomerBlock /> : null}
      {tab === "auto" ? <AutoInsuranceBlocks /> : null}
      {tab === "home" ? <HomeInsuranceBlocks /> : null}
      {tab === "property" ? <PropertyBlocks /> : null}
      {tab === "driver" ? <DriverBlocks /> : null}
    </div>
  );
}
