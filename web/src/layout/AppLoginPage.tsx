import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconLogin2, IconUserHexagon, IconUserScreen } from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { Box, Center, Card, Text, Tabs, TextInput, PasswordInput, Stack, Alert, Space } from "@mantine/core";
import { fetchAdminStatus, login, registerAdmin, registerUser, setCreds } from "../services/AccountService";
import { AccountCreds } from "../types/app";

import styles from "./AppLoginPage.module.css";
import { useInterLinkedTheme } from "./hooks/useInterLinkedTheme";
import { useIntroFlow } from "./hooks/useIntroFlow";
import { LogoIntro } from "./components/LogoIntro";
import { IconButton } from "./components/IconButton";

export default function AppLoginPage(): JSX.Element {
  const [tab, setTab] = useState<"login" | "user" | "admin">("login");
  const [error, setError] = useState<string | null>(null);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  const nav = useNavigate();
  const { grid } = useInterLinkedTheme();

  const loginForm = useForm({ initialValues: { email: "", password: "" } });
  const registerAdminForm = useForm({ initialValues: { email: "", password: "" } });
  const registerUserForm = useForm({ initialValues: { email: "", password: "" } });

  // Intro flow for the login page
  const flow = useIntroFlow<AccountCreds>({
    gateEnabled: true, // enable the gate to block access until intro is done
    gateStartsHidden: true, // start with the card hidden
    exitMs: 280,
  });

  // On mount, check if an admin exists
  useEffect(() => {
    (async () => {
      const status = await fetchAdminStatus();
      setHasAdmin(status.hasAdmin);
      setTab(status.hasAdmin ? "login" : "admin");
    })();
  }, []);

  // Fade card out + animate logo out, then commit creds and navigate.
  const saveAndAnimate = useCallback(
    (creds: AccountCreds) => {
      flow.exit.startExit(creds, (c) => {
        setCreds(c.email, c.password, c.role);
        nav("/", { replace: true });
      });
    },
    [flow.exit, nav]
  );

  const handleLogin = loginForm.onSubmit(async ({ email, password }) => {
    setError(null);
    email = email.trim().toLowerCase();

    const resp = await login({ email, password });
    if (resp?.ok) return saveAndAnimate({ email, password, role: resp.role });

    setError(resp?.error || "Invalid credentials");
  });

  const handleAdminRegister = registerAdminForm.onSubmit(async ({ email, password }) => {
    setError(null);
    email = email.trim().toLowerCase();

    const regResp = await registerAdmin({ email, password });
    if (!regResp?.ok) return setError(regResp?.error || "Registration failed");

    const loginResp = await login({ email, password });
    const role = loginResp?.ok ? loginResp.role : "admin";

    saveAndAnimate({ email, password, role });
  });

  const handleUserRegister = registerUserForm.onSubmit(async ({ email, password }) => {
    setError(null);
    email = email.trim().toLowerCase();

    const regResp = await registerUser({ email, password });
    if (!regResp?.ok) {
      const msg =
        regResp?.error === "no_admin_yet"
          ? "An admin must exist before you can register."
          : regResp?.error === "user_exists"
            ? "User already exists."
            : regResp?.error || "Registration failed";
      return setError(msg);
    }

    const loginResp = await login({ email, password });
    const role = loginResp?.ok ? loginResp.role : "user";

    saveAndAnimate({ email, password, role });
  });

  return (
    <Box style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      {/* Logo intro drives the gate */}
      <LogoIntro
        variant="loginHero"
        exiting={flow.exit.exiting}
        onDone={flow.gate.onIntroDone}
      />

      <Center
        h="100vh"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: grid.z.base,
          pointerEvents: "none",
        }}
      >
        <Text
          className={styles.loadingFx}
          data-text="LOADING"
          c="var(--interlinked-color-secondary)"
          ff="Cyber City"
          fz={10}
        >
          LOADING
        </Text>
      </Center>

      <Center h="100vh" style={{ position: "relative", zIndex: grid.z.aboveBase }}>
        <Box className={styles.cardFx} data-reveal={flow.gate.introDone ? "true" : "false"}>
          <Box className={styles.cardFxInner}>

            <Card withBorder shadow="sm" radius="sm" p="xl" w={480}>
              <Tabs
                value={tab}
                onChange={(v) => setTab(v as any)}
                keepMounted={false}
                color="var(--interlinked-color-secondary)"
                styles={{
                  tab: { fontWeight: 500 },
                  tabLabel: { letterSpacing: 0.2 },
                }}
              >
                <Tabs.List
                  grow
                  style={{
                    borderBottom:
                      "1px solid color-mix(in srgb, var(--interlinked-color-secondary) 24%, transparent)",
                  }}
                >
                  <Tabs.Tab value="login">Login</Tabs.Tab>
                  <Tabs.Tab value="user" disabled={!hasAdmin}>
                    Register User
                  </Tabs.Tab>
                  <Tabs.Tab value="admin" disabled={!!hasAdmin}>
                    Register Admin
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="login" pt="md">
                  <form onSubmit={handleLogin}>
                    <Stack>
                      <TextInput label="Email" {...loginForm.getInputProps("email")} />
                      <PasswordInput label="Password" {...loginForm.getInputProps("password")} />
                      <IconButton
                        text="Login"
                        icon={<IconLogin2 color="var(--interlinked-color-secondary)" size={14} />}
                        type="submit"
                        style={{ maxWidth: "130px" }}
                      />
                    </Stack>
                  </form>
                </Tabs.Panel>

                <Tabs.Panel value="user" pt="md">
                  <form onSubmit={handleUserRegister}>
                    <Stack>
                      {!hasAdmin && (
                        <Alert color="var(--interlinked-color-warning)">
                          An admin must exist before you can register.
                        </Alert>
                      )}
                      <TextInput label="Email" {...registerUserForm.getInputProps("email")} />
                      <PasswordInput label="Password" {...registerUserForm.getInputProps("password")} />
                      <IconButton
                        text="Register"
                        icon={<IconUserHexagon color="var(--interlinked-color-secondary)" size={14} />}
                        type="submit"
                        style={{ maxWidth: "130px" }}
                      />
                    </Stack>
                  </form>
                </Tabs.Panel>

                <Tabs.Panel value="admin" pt="md">
                  <form onSubmit={handleAdminRegister}>
                    <Stack>
                      {hasAdmin && (
                        <Alert color="var(--interlinked-color-warning)">
                          An admin already exists in this system.
                        </Alert>
                      )}
                      <TextInput label="Admin Email" {...registerAdminForm.getInputProps("email")} />
                      <PasswordInput label="Admin Password" {...registerAdminForm.getInputProps("password")} />
                      <IconButton
                        text="Create Admin"
                        icon={<IconUserScreen color="var(--interlinked-color-secondary)" size={14} />}
                        type="submit"
                        style={{ maxWidth: "130px" }}
                      />
                    </Stack>
                  </form>
                </Tabs.Panel>
              </Tabs>

              {error && (
                <>
                  <Space h="md" />
                  <Alert color="var(--interlinked-color-error)">
                    <Text size="sm">{error}</Text>
                  </Alert>
                </>
              )}
            </Card>

          </Box>
        </Box>
      </Center>
    </Box>
  );
}
