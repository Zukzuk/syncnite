import React, { createContext, useContext } from "react";

type AppContextValue = {
};

const AppContext = createContext<AppContextValue>({ });

export const useAppContext = () => useContext(AppContext);

export function AppProvider({
    children,
}: {
    navW: number;
    children: React.ReactNode;
}) {
    return (
        <AppContext.Provider value={{}}>
            {children}
        </AppContext.Provider>
    );
}
