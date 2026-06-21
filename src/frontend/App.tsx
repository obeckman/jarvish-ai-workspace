import { Suspense, lazy, useMemo, useState } from 'react'
import { Bot, Boxes, PanelLeftClose, PanelLeftOpen, Sparkles } from 'lucide-react'

import './App.scss'
import { ModalContextProvider } from '@/frontend/components/shared/ModalProvider/ModalProvider'
import { ReliableSubmitManger } from '@/frontend/features/ReliableSubmit/useReliableSubmit'
import {
  capabilities,
  defaultCapabilityId,
  type Capability,
  type CapabilityGroup,
} from '@/frontend/capabilities'

const groupLabels: Record<CapabilityGroup, string> = {
  agent: 'AI Agent',
  frontend: 'Frontend Capabilities',
}

function getCapabilityById(id: string) {
  return capabilities.find((capability) => capability.id === id) ?? capabilities[0]
}

function CapabilityButton({
  capability,
  isActive,
  onSelect,
  tabIndex,
}: {
  capability: Capability
  isActive: boolean
  onSelect: (id: string) => void
  tabIndex?: number
}) {
  return (
    <button
      type="button"
      className="capability-button"
      aria-pressed={isActive}
      tabIndex={tabIndex}
      onClick={() => onSelect(capability.id)}
    >
      <span className="capability-button__label">{capability.label}</span>
      <span className="capability-button__summary">{capability.summary}</span>
    </button>
  )
}

function CapabilityLoading({ label }: { label: string }) {
  return (
    <div className="capability-loading" role="status" aria-live="polite">
      <Sparkles size={18} aria-hidden="true" />
      <span>Loading {label}</span>
    </div>
  )
}

function App() {
  const [activeCapabilityId, setActiveCapabilityId] = useState(defaultCapabilityId)
  const [isCapabilityPanelOpen, setIsCapabilityPanelOpen] = useState(false)
  const activeCapability = getCapabilityById(activeCapabilityId)
  const ActiveCapability = useMemo(
    () => lazy(activeCapability.load),
    [activeCapability],
  )

  const groupedCapabilities = useMemo(
    () =>
      capabilities.reduce<Record<CapabilityGroup, Capability[]>>(
        (groups, capability) => {
          groups[capability.group].push(capability)
          return groups
        },
        { agent: [], frontend: [] },
      ),
    [],
  )

  return (
    <ModalContextProvider>
      <ReliableSubmitManger>
        <div className="portfolio-shell">
          <aside
            className="capability-sidebar"
            aria-label="Project capabilities"
            data-open={isCapabilityPanelOpen}
          >
            <div className="capability-sidebar__brand">
              <Bot size={28} aria-hidden="true" />
              <div className="capability-sidebar__brand-copy">
                <p>Using</p>
                <h1>{activeCapability.label}</h1>
              </div>
              <button
                type="button"
                className="capability-sidebar__toggle"
                aria-controls="capability-nav"
                aria-expanded={isCapabilityPanelOpen}
                aria-label={isCapabilityPanelOpen ? 'Close capabilities panel' : 'Open capabilities panel'}
                data-tooltip={`Using ${activeCapability.label}`}
                onClick={() => setIsCapabilityPanelOpen((isOpen) => !isOpen)}
              >
                {isCapabilityPanelOpen ? (
                  <PanelLeftClose size={18} aria-hidden="true" />
                ) : (
                  <PanelLeftOpen size={18} aria-hidden="true" />
                )}
                <span className="capability-sidebar__toggle-dot" aria-hidden="true" />
              </button>
            </div>

            <nav className="capability-nav" id="capability-nav" aria-hidden={!isCapabilityPanelOpen}>
              {Object.entries(groupedCapabilities).map(([group, groupCapabilities]) => (
                <section className="capability-group" key={group}>
                  <div className="capability-group__header">
                    <Boxes size={16} aria-hidden="true" />
                    <span>{groupLabels[group as CapabilityGroup]}</span>
                  </div>
                  <div className="capability-group__items">
                    {groupCapabilities.map((capability) => (
                      <CapabilityButton
                        capability={capability}
                        isActive={capability.id === activeCapabilityId}
                        key={capability.id}
                        onSelect={setActiveCapabilityId}
                        tabIndex={isCapabilityPanelOpen ? 0 : -1}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </nav>
          </aside>

          <main className="capability-stage">
            <Suspense fallback={<CapabilityLoading label={activeCapability.label} />}>
              <ActiveCapability />
            </Suspense>
          </main>
        </div>
      </ReliableSubmitManger>
    </ModalContextProvider>
  )
}

export default App
