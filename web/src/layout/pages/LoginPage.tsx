import * as React from "react";
import { Box, Center, Card, Text, Tabs, TextInput, PasswordInput, Button, Stack, Alert, Space } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useForm } from "@mantine/form";
import { login, registerAdmin, registerUser, fetchAdminStatus } from "../../lib/api";
import { setCreds } from "../../lib/utils";
import { LogoIntro } from "../../components/LogoIntro";
import { Role } from "../../types/types";
import styles from "./LoginPage.module.css";
import { useIntroFlow, LOGO_EXIT_MS } from "../../hooks/useIntroFlow";

type PendingCreds = { email: string; password: string; role: Role };

export default function LoginPage(): JSX.Element {
  const nav = useNavigate();
  const [tab, setTab] = React.useState<"login" | "user" | "admin">("login");
  const [error, setError] = React.useState<string | null>(null);
  const [hasAdmin, setHasAdmin] = React.useState<boolean | null>(null);

  const flow = useIntroFlow<PendingCreds>({
    gateEnabled: true, // login page always uses the intro gate
    gateStartsHidden: true, // card starts hidden until LogoIntro calls onDone
    exitMs: LOGO_EXIT_MS,
  });

  React.useEffect(() => {
    (async () => {
      const status = await fetchAdminStatus();
      setHasAdmin(status.hasAdmin);
      setTab(status.hasAdmin ? "login" : "admin");
    })();
  }, []);

  const loginForm = useForm({ initialValues: { email: "", password: "" } });
  const registerAdminForm = useForm({ initialValues: { email: "", password: "" } });
  const registerUserForm = useForm({ initialValues: { email: "", password: "" } });

  const triggerExitThenCommitAndGoHome = React.useCallback(
    (creds: PendingCreds) => {
      // Fade card out + animate logo out, then commit creds and navigate.
      flow.exit.startExit(creds, (c) => {
        setCreds(c.email, c.password, c.role);
        nav("/", { replace: true });
      });
    },
    [flow.exit, nav]
  );

  const actionBtnProps = {
    size: "xs" as const,
    radius: "sm" as const,
    variant: "light" as const,
    justify: "space-between" as const,
    rightSection: <span />,
  };

  const handleLogin = loginForm.onSubmit(async ({ email, password }) => {
    setError(null);
    email = email.trim().toLowerCase();

    const resp = await login({ email, password });
    if (resp?.ok) return triggerExitThenCommitAndGoHome({ email, password, role: resp.role });

    setError(resp?.error || "Invalid credentials");
  });

  const handleAdminRegister = registerAdminForm.onSubmit(async ({ email, password }) => {
    setError(null);
    email = email.trim().toLowerCase();

    const regResp = await registerAdmin({ email, password });
    if (!regResp?.ok) return setError(regResp?.error || "Registration failed");

    const loginResp = await login({ email, password });
    const role = loginResp?.ok ? loginResp.role : "admin";

    triggerExitThenCommitAndGoHome({ email, password, role });
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

    triggerExitThenCommitAndGoHome({ email, password, role });
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
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <Text className={styles.loadingFx} data-text="LOADING" size="xs" c="var(--interlinked-color-secondary)" ff="Cyber City">
          LOADING
        </Text>
      </Center>

      <Center h="100vh" style={{ position: "relative", zIndex: 2 }}>
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
                      <Button type="submit" {...actionBtnProps}>
                        Log in
                      </Button>
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
                      <Button type="submit" disabled={!hasAdmin} {...actionBtnProps}>
                        Register
                      </Button>
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
                      <Button type="submit" disabled={!!hasAdmin} {...actionBtnProps}>
                        Create Admin
                      </Button>
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
