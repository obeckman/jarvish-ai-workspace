import { Suspense, lazy, useMemo, useState } from 'react'
import { Bot, Boxes, Sparkles } from 'lucide-react'

import './App.css'
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
}: {
  capability: Capability
  isActive: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      className="capability-button"
      aria-pressed={isActive}
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
          <aside className="capability-sidebar" aria-label="Project capabilities">
            <div className="capability-sidebar__brand">
              <Bot size={28} aria-hidden="true" />
              <div>
                <h1>Jarvish</h1>
                <p>AI agent workspace</p>
              </div>
            </div>

            <nav className="capability-nav">
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
