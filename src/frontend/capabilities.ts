import type { ComponentType } from 'react'

export type CapabilityGroup = 'agent' | 'frontend'

export type Capability = {
  id: string
  label: string
  summary: string
  group: CapabilityGroup
  load: () => Promise<{ default: ComponentType }>
}

const fromNamedExport = <TModule, TKey extends keyof TModule>(
  importer: () => Promise<TModule>,
  exportName: TKey,
) =>
  importer().then((module) => ({
    default: module[exportName] as ComponentType,
  }))

export const capabilities: Capability[] = [
  {
    id: 'jarvish-agent',
    label: 'Jarvish Agent',
    summary: 'Graph-backed AI workspace with memory, tools, and structured responses.',
    group: 'agent',
    load: () =>
      fromNamedExport(
        () => import('@/frontend/features/jarvishAgent'),
        'JarvishAgent',
      ),
  },
  {
    id: 'normalization',
    label: 'Access Normalization',
    summary: 'User/group normalization workflow for permission-heavy domains.',
    group: 'frontend',
    load: () =>
      fromNamedExport(
        () => import('@/frontend/features/NormalizationOfUsersAndGroups/NormalizationOfUsersAndGroups'),
        'NormalizationOfUsersAndGroups',
      ),
  },
  {
    id: 'file-system-tree',
    label: 'File System Tree',
    summary: 'Recursive tree rendering with selection and expansion behavior.',
    group: 'frontend',
    load: () =>
      fromNamedExport(
        () => import('@/frontend/features/FileSystemTree/FileSystemTreeDemo'),
        'FileSystemTreeDemo',
      ),
  },
  {
    id: 'reliable-submit',
    label: 'Reliable Submit',
    summary: 'Optimistic submit state management with retry-safe UX boundaries.',
    group: 'frontend',
    load: () =>
      fromNamedExport(
        () => import('@/frontend/features/ReliableSubmit/UseReliableSubmitDemo'),
        'UseReliableSubmitDemo',
      ),
  },
  {
    id: 'retry-mechanism',
    label: 'Retry Mechanism',
    summary: 'Retry control flow and error state visualization.',
    group: 'frontend',
    load: () =>
      fromNamedExport(
        () => import('@/frontend/features/RetryMechanism/RetryMechanismDemo'),
        'RetryMechanismDemo',
      ),
  },
  {
    id: 'api-aggregator',
    label: 'API Aggregator',
    summary: 'Fan-out/fan-in UI pattern for multiple service responses.',
    group: 'frontend',
    load: () =>
      fromNamedExport(
        () => import('@/frontend/features/APIAggregator/APIAggregator'),
        'APIAggregator',
      ),
  },
  {
    id: 'virtualized-scroll',
    label: 'Virtualized Scroll',
    summary: 'Large-list rendering without forcing the DOM to carry every row.',
    group: 'frontend',
    load: () =>
      fromNamedExport(
        () => import('@/frontend/features/InfiniteScroll/InfiniteVirtualizedScroll/InfiniteVirtualizedScrollDemo'),
        'InfiniteVirtualizedScrollDemo',
      ),
  },
  {
    id: 'dynamic-form',
    label: 'Dynamic Form',
    summary: 'Schema-shaped form rendering and controlled state updates.',
    group: 'frontend',
    load: () =>
      fromNamedExport(
        () => import('@/frontend/features/DynamicForm/DynamicFormDemo'),
        'DynamicFormDemo',
      ),
  },
  {
    id: 'access-control',
    label: 'Access Control',
    summary: 'Reusable authorization wrapper for role-gated interface states.',
    group: 'frontend',
    load: () =>
      fromNamedExport(
        () => import('@/frontend/features/AccessControlWrapper/AccessControlWrapper'),
        'AccessControlWrapperDemo',
      ),
  },
  {
    id: 'time-series',
    label: 'Time Series Widget',
    summary: 'Data-dense visualization component with reusable chart structure.',
    group: 'frontend',
    load: () =>
      fromNamedExport(
        () => import('@/frontend/features/TimeSeriesWidget/TimeSeriesWidget'),
        'TimeSeriesWidgetDemo',
      ),
  },
  {
    id: 'grid-canvas',
    label: 'Dynamic Grid Canvas',
    summary: 'Interactive grid rendering and coordinate-oriented UI state.',
    group: 'frontend',
    load: () =>
      fromNamedExport(
        () => import('@/frontend/features/DynamicGridCanvas/DynamicGridCanvas'),
        'DynamicGridCanvasDemo',
      ),
  },
]

export const defaultCapabilityId = 'jarvish-agent'
