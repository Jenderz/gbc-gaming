import React, { createContext, useContext } from 'react';

export interface AgencyContextType {
    isAgencyMode: true;
}

const AgencyContext = createContext<AgencyContextType | null>(null);

/**
 * Wraps children components so they detect "agency mode" via useAgencyMode().
 * When active, components should route API calls through /agency/* endpoints.
 */
export const AgencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AgencyContext.Provider value={{ isAgencyMode: true }}>
        {children}
    </AgencyContext.Provider>
);

/**
 * Returns true if the current component tree is inside <AgencyProvider>.
 */
export function useAgencyMode(): boolean {
    const ctx = useContext(AgencyContext);
    return !!ctx?.isAgencyMode;
}
