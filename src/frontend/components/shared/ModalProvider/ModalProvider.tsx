import React, { ReactNode } from "react"
import { createPortal } from "react-dom"
import  "./ModalProvider.css"

type ModalContextValue = {
    openModal: (modalConfig: ModalConfig) => void;
    closeModal: () => void;
}

type ModalConfig = {
    content: ReactNode,
    id: string,
    onClose?: () => void
}


const modalContext = React.createContext<ModalContextValue | undefined>(undefined)

const ModalRenderer = React.memo(({ modalConfig: { id, content, onClose } }: { modalConfig: ModalConfig }) => {
    const { closeModal } = useModalContext()

    const InnerCloseModel = () => {
        onClose?.()
        closeModal()
    }

    return createPortal(
        <div className="ModalRenderer_modal-wrapper">
            <div
                className="ModalRenderer_modal-backdrop"
                onClick={InnerCloseModel}
            />
            <div className="ModalRenderer_modal-content">
                {content}
            </div>
        </div>
        , document.body
    )
})

export const ModalContextProvider = ({ children }: { children: ReactNode }) => {

    const [modalConfigs, setModalConfigs] = React.useState<ModalConfig[]>([])

    const openModal = React.useCallback((modalConfig: ModalConfig) => {
        setModalConfigs(prev => [...prev, modalConfig])
    }, [])

    const closeModal = React.useCallback(() => {
        setModalConfigs(prev => {
            return prev.slice(0, -1);
        })
    }, [])

    const value = React.useMemo(() => ({ openModal, closeModal }), [])

    return (<modalContext.Provider value={value} >
        {children}
        {modalConfigs.map(modalConfig => <ModalRenderer key={modalConfig.id} modalConfig={modalConfig} />)}
    </modalContext.Provider>
    )
}

const useModalContext = () => {
    const context = React.useContext(modalContext)
    if (!context) throw new Error('no modalContext provider found')

    return context
}
export const ModalOpener = () => {
    const { openModal, closeModal } = useModalContext()
    const modalContentB = <div>
        modal A
        <button onClick={() => closeModal()}>close Modal modal A</button>

    </div>
    const openModalB = () => openModal({
        content: modalContentB,
        id: " modal B",
        onClose: () => console.debug('onClose modal B')
    })
    const modalContentA = <div style={{ width: '500px' }}>modal A
        <button onClick={() => closeModal()}>close Modal modal A</button>
        <button onClick={openModalB}>open Modal modal B</button>
    </div>

    const openModalA = () => openModal({
        content: modalContentA,
        id: " modal A",
        onClose: () => console.debug('onClose modal A')
    })

    return (
        <button onClick={openModalA}>open modal A</button>
    )
}

