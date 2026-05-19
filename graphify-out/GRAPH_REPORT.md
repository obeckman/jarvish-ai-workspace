# Graph Report - .  (2026-05-19)

## Corpus Check
- Corpus is ~46,625 words - fits in a single context window. You may not need a graph.

## Summary
- 752 nodes · 1388 edges · 62 communities (52 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.83)
- Token cost: 13,226 input · 1,653 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Agent Backend Graph|Agent Backend Graph]]
- [[_COMMUNITY_Session Database Schema|Session Database Schema]]
- [[_COMMUNITY_GraphQL Resolver Types|GraphQL Resolver Types]]
- [[_COMMUNITY_Strategy Game Map|Strategy Game Map]]
- [[_COMMUNITY_Build Tooling Config|Build Tooling Config]]
- [[_COMMUNITY_Backend Server Dependencies|Backend Server Dependencies]]
- [[_COMMUNITY_Jarvish GraphQL State|Jarvish GraphQL State]]
- [[_COMMUNITY_Agent Tool Processing|Agent Tool Processing]]
- [[_COMMUNITY_Module Allow Lib|Module Allow Lib]]
- [[_COMMUNITY_Form Builder Fields|Form Builder Fields]]
- [[_COMMUNITY_Chat Block Rendering|Chat Block Rendering]]
- [[_COMMUNITY_User Notify Store|User Notify Store]]
- [[_COMMUNITY_Store Count App|Store Count App]]
- [[_COMMUNITY_Agent Chat Input|Agent Chat Input]]
- [[_COMMUNITY_Api Grid Aggregator|Api Grid Aggregator]]
- [[_COMMUNITY_Access Control Permissions|Access Control Permissions]]
- [[_COMMUNITY_Reliable Submit Flow|Reliable Submit Flow]]
- [[_COMMUNITY_Jarvish Message Blocks|Jarvish Message Blocks]]
- [[_COMMUNITY_Heavy Worker Demo|Heavy Worker Demo]]
- [[_COMMUNITY_Dynamic Form Context|Dynamic Form Context]]
- [[_COMMUNITY_Metadata Json Created|Metadata Json Created]]
- [[_COMMUNITY_Infinite Scroll Item|Infinite Scroll Item]]
- [[_COMMUNITY_Tab Tabs Active|Tab Tabs Active]]
- [[_COMMUNITY_Block Schema Action|Block Schema Action]]
- [[_COMMUNITY_Jarvish Sidebar Header|Jarvish Sidebar Header]]
- [[_COMMUNITY_Block Action Schema|Block Action Schema]]
- [[_COMMUNITY_Proxy State Any|Proxy State Any]]
- [[_COMMUNITY_Modal Context Config|Modal Context Config]]
- [[_COMMUNITY_Tree File System|Tree File System]]
- [[_COMMUNITY_Card Item Image|Card Item Image]]
- [[_COMMUNITY_Module Compiler Options|Module Compiler Options]]
- [[_COMMUNITY_Resilient Fetch Retry|Resilient Fetch Retry]]
- [[_COMMUNITY_Image Carousel High|Image Carousel High]]
- [[_COMMUNITY_Conversion Two Way|Conversion Two Way]]
- [[_COMMUNITY_Google Integration Skill|Google Integration Skill]]
- [[_COMMUNITY_Api Response Character|Api Response Character]]
- [[_COMMUNITY_Legacy Chart Time|Legacy Chart Time]]
- [[_COMMUNITY_Gmail Search Get|Gmail Search Get]]
- [[_COMMUNITY_Logger Implementation Plan|Logger Implementation Plan]]
- [[_COMMUNITY_Journal Json Dialect|Journal Json Dialect]]
- [[_COMMUNITY_Silent Interval The|Silent Interval The]]
- [[_COMMUNITY_Code Block|Code Block]]
- [[_COMMUNITY_Mappings User Normalization|Mappings User Normalization]]
- [[_COMMUNITY_Api Json Todos|Api Json Todos]]
- [[_COMMUNITY_Search Debounce Autocomplete|Search Debounce Autocomplete]]
- [[_COMMUNITY_Inventory Check Args|Inventory Check Args]]
- [[_COMMUNITY_Dynamic Virtual List|Dynamic Virtual List]]
- [[_COMMUNITY_Codegen Config|Codegen Config]]
- [[_COMMUNITY_Virtual List|Virtual List]]
- [[_COMMUNITY_Family Discussion Proposal|Family Discussion Proposal]]

## God Nodes (most connected - your core abstractions)
1. `ResolversTypes` - 48 edges
2. `resolvers` - 31 edges
3. `columns` - 27 edges
4. `primaryKey` - 21 edges
5. `notNull` - 21 edges
6. `autoincrement` - 21 edges
7. `compilerOptions` - 20 edges
8. `ROLES` - 19 edges
9. `logger` - 18 edges
10. `FormBuilder()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `cors` --calls--> `runWebServer()`  [INFERRED]
  package.json → src/Backend/WebServer/index.ts
- `express` --calls--> `runWebServer()`  [INFERRED]
  package.json → src/Backend/WebServer/index.ts
- `Gemini Development Guidelines` --conceptually_related_to--> `Tech Stack: my-react-playground`  [INFERRED]
  GEMINI.md → conductor/tech-stack.md
- `JarvishMemoryPanel()` --calls--> `useJarvishMemory()`  [EXTRACTED]
  src/features/jarvishAgent/components/JarvishMemoryPanel.tsx → src/features/jarvishAgent/hooks/useJarvishMemory.ts
- `Gemini Development Guidelines` --references--> `Backend Logger Implementation Plan`  [EXTRACTED]
  GEMINI.md → conductor/tracks/backend-logger/plan.md

## Communities (62 total, 10 thin omitted)

### Community 0 - "Agent Backend Graph"
Cohesion: 0.06
Nodes (56): createAgentGraph(), AgentState, AgentStateType, initializingBEServer(), db, sqlite, NewSession, NewSessionSummary (+48 more)

### Community 1 - "Session Database Schema"
Cohesion: 0.13
Nodes (54): checkpoints, SessionSummary, StructuredFact, default, ai_answer, category, channel, confidence (+46 more)

### Community 2 - "GraphQL Resolver Types"
Cohesion: 0.05
Nodes (44): AgentEvent, AgentEventResolvers, AttachmentInput, DirectiveResolverFn, EventType, InputMaybe, IsTypeOfResolverFn, JsonScalarConfig (+36 more)

### Community 3 - "Strategy Game Map"
Cohesion: 0.10
Nodes (34): classnames, UNIT_SPEEDS, ContextMenu(), ContextMenuProps, GameApp(), initialState, GameContext, GameContextType (+26 more)

### Community 4 - "Build Tooling Config"
Cohesion: 0.05
Nodes (41): devDependencies, concurrently, drizzle-kit, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+33 more)

### Community 5 - "Backend Server Dependencies"
Cohesion: 0.06
Nodes (34): handleGraphQLRequests(), schema, dependencies, better-sqlite3, cors, dotenv, drizzle-orm, express (+26 more)

### Community 6 - "Jarvish GraphQL State"
Cohesion: 0.12
Nodes (27): useJarvishMemory(), useJarvishSessions(), GQL_FRAGMENTS, GQL_MUTATIONS, GQL_QUERIES, GQL_SUBSCRIPTIONS, INITIAL_CHAT_STATE, STATE_ACTIONS (+19 more)

### Community 7 - "Agent Tool Processing"
Cohesion: 0.17
Nodes (18): forgetMemory(), processingNode(), handleQueryAttachments(), toolsNode(), readFile(), writeFile(), getGoogleDocContent(), getOAuth2Client() (+10 more)

### Community 8 - "Module Allow Lib"
Cohesion: 0.08
Nodes (23): compilerOptions, allowImportingTsExtensions, allowJs, allowSyntheticDefaultImports, baseUrl, esModuleInterop, forceConsistentCasingInFileNames, ignoreDeprecations (+15 more)

### Community 9 - "Form Builder Fields"
Cohesion: 0.10
Nodes (18): FIELD_REGISTRY, FieldWrapper, FormBuilder(), FormContext, FormContextType, FormInputsProps, GroupField, SelectInput (+10 more)

### Community 10 - "Chat Block Rendering"
Cohesion: 0.14
Nodes (15): AskAgent(), ActionBlock, ActionBlockProps, AnyBlockComponentProps, BLOCK_COMPONENTS, CodeBlock, DraftBlock(), DraftBlockProps (+7 more)

### Community 11 - "User Notify Store"
Cohesion: 0.20
Nodes (14): channel, DBContext, DBProvider(), useDBStore(), useDBStoreProps, useDBSubscription(), defaultUser, IndexDBDemo() (+6 more)

### Community 12 - "Store Count App"
Cohesion: 0.17
Nodes (7): countSelector(), initialValue, StateType, AppState, appStore, getCount(), getUseName()

### Community 13 - "Agent Chat Input"
Cohesion: 0.17
Nodes (13): AgentChat(), JarvishChatInput(), AgentState, useAgent(), useGoogleAuth(), Attachment, AgentStatus, BlockType (+5 more)

### Community 14 - "Api Grid Aggregator"
Cohesion: 0.16
Nodes (7): APIAggregator(), TabsApiRaceConditionDemo(), DynamicGridCanvasDemo(), GridItem, Tabs, TabVariant, TabVariantValue

### Community 15 - "Access Control Permissions"
Cohesion: 0.20
Nodes (13): AccessControlButton(), SomeFeatureWithToggle(), useAccessControl(), UserPermissionsContext, UserSetPermissionsContext, useSetUserPermissionsContext(), useUserPermissionsContext(), AccessControlWrapperProps (+5 more)

### Community 16 - "Reliable Submit Flow"
Cohesion: 0.24
Nodes (11): isKeyofSubmitFunction(), SubmitFunctionTypes, SubmitFunctionValue, SubmitFn, SubmitFunctionMap, SubmitParameterType, SubmitResponse, useReliableSubmitProps (+3 more)

### Community 17 - "Jarvish Message Blocks"
Cohesion: 0.20
Nodes (12): AgentMessageBlock, BlockRenderer, BlockRendererProps, ChatMessage, ChatMessageProps, JarvishChatArea(), JarvishChatAreaProps, Jarvish Agent Product Definition (+4 more)

### Community 18 - "Heavy Worker Demo"
Cohesion: 0.24
Nodes (10): ExpectedData, result, webWorker, myExpensiveFunction(), MyComponent(), CustomWorkerScope, WorkerRequest, WorkerResponse (+2 more)

### Community 19 - "Dynamic Form Context"
Cohesion: 0.29
Nodes (10): DynamicForm(), DynamicFormContext, DynamicFormInput(), DynamicFormSubmit(), useDynamicFormInputData(), DynamicFormDemo(), DynamicFormContextValue, DynamicFormInputProps (+2 more)

### Community 20 - "Metadata Json Created"
Cohesion: 0.22
Nodes (10): created, id, phases, status, tasks, completed, total, title (+2 more)

### Community 21 - "Infinite Scroll Item"
Cohesion: 0.22
Nodes (7): InfiniteVirtualizedScroll(), integrationAPIconfigType, useInfiniteFetch(), useOnScreen(), UseOnScreenOptions, InfiniteScrollDemoItemType, integrationAPIconfig

### Community 22 - "Tab Tabs Active"
Cohesion: 0.31
Nodes (7): ActiveTabProviderValue, SetActiveTabProviderValue, TabsContentProps, TabsProps, TabsTriggerProps, TabVariant, TabVariantValue

### Community 23 - "Block Schema Action"
Cohesion: 0.20
Nodes (9): ActionBlockSchema, CodeBlockSchema, DataBlockSchema, DraftBlockSchema, ReasoningBlockSchema, TextBlockSchema, DataBlock, DataBlockProps (+1 more)

### Community 24 - "Jarvish Sidebar Header"
Cohesion: 0.25
Nodes (6): JarvishHeader(), JarvishHeaderProps, JarvishMemoryPanel(), JarvishSidebar(), JarvishSidebarProps, JarvishAgent()

### Community 25 - "Block Action Schema"
Cohesion: 0.22
Nodes (8): ActionBlockComponentProps, CodeBlockComponentProps, DocumentBlockComponentProps, DraftBlockComponentProps, ReasoningBlockComponentProps, TextBlockComponentProps, ActionBlockSchema, DataBlockSchema

### Community 26 - "Proxy State Any"
Cohesion: 0.25
Nodes (7): AnyObject, App(), ListenersMap, Proxied, ProxyListener, state, useSnapshot()

### Community 27 - "Modal Context Config"
Cohesion: 0.29
Nodes (7): ModalConfig, modalContext, ModalContextProvider(), ModalContextValue, ModalOpener(), ModalRenderer, useModalContext()

### Community 28 - "Tree File System"
Cohesion: 0.32
Nodes (5): FileSystemTree(), TreeNode, TreeStateContext, FileNode, TreeContextType

### Community 29 - "Card Item Image"
Cohesion: 0.29
Nodes (4): Card, CardItemProps, data, Image()

### Community 30 - "Module Compiler Options"
Cohesion: 0.29
Nodes (6): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, include

### Community 31 - "Resilient Fetch Retry"
Cohesion: 0.43
Nodes (4): DEFAULT_FETCH_OPTIONS, useResilientFetch(), ResilientSettings, UseResilientFetchProps

### Community 32 - "Image Carousel High"
Cohesion: 0.40
Nodes (4): HighPerfCarousel(), ImageProps, styles, useLeastRecentlyUsedCache()

### Community 33 - "Conversion Two Way"
Cohesion: 0.33
Nodes (5): conversionMapForDemo, ConversionName, DistanceConverter(), TwoWayBindingContext, TwoWayBindingProps

### Community 34 - "Google Integration Skill"
Cohesion: 0.40
Nodes (3): Google API Integration Skill, Google Identity Services SDK, Stateless Google API Architecture

### Community 35 - "Api Response Character"
Cohesion: 0.50
Nodes (4): ApiResponse, Character, RickAndMorty(), usefetchCharacters()

### Community 36 - "Legacy Chart Time"
Cohesion: 0.50
Nodes (3): LegacyChartInstance, TimeSeriesWidgetDataPoint, TimeSeriesWidgetProps

### Community 37 - "Gmail Search Get"
Cohesion: 0.67
Nodes (3): getClient(), gmailSearchDeclaration, searchGmailMessages()

### Community 38 - "Logger Implementation Plan"
Cohesion: 0.50
Nodes (4): Backend Logger Implementation Plan, Gemini Development Guidelines, Tech Stack: my-react-playground, Track: GraphQL CodeGen Integration

### Community 39 - "Journal Json Dialect"
Cohesion: 0.50
Nodes (3): dialect, entries, version

## Knowledge Gaps
- **287 isolated node(s):** `composite`, `module`, `moduleResolution`, `allowSyntheticDefaultImports`, `include` (+282 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `resolvers` connect `Agent Backend Graph` to `Session Database Schema`, `Agent Chat Input`, `GraphQL Resolver Types`, `Backend Server Dependencies`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Backend Server Dependencies` to `Strategy Game Map`, `Build Tooling Config`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `Markdown` connect `Chat Block Rendering` to `Jarvish Sidebar Header`, `Jarvish Message Blocks`, `Agent Chat Input`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **What connects `composite`, `module`, `moduleResolution` to the rest of the system?**
  _287 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Agent Backend Graph` be split into smaller, more focused modules?**
  _Cohesion score 0.06321839080459771 - nodes in this community are weakly interconnected._
- **Should `Session Database Schema` be split into smaller, more focused modules?**
  _Cohesion score 0.13265993265993267 - nodes in this community are weakly interconnected._
- **Should `GraphQL Resolver Types` be split into smaller, more focused modules?**
  _Cohesion score 0.045454545454545456 - nodes in this community are weakly interconnected._