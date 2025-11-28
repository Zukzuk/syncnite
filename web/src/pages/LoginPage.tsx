import * as React from "react";
import { Card, Tabs, Stack, TextInput, PasswordInput, Button, Text, Alert, Center, Space } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useForm } from "@mantine/form";
import { login, registerAdmin, registerUser, fetchAdminStatus } from "../lib/api";
import { setCreds } from "../lib/utils";

export default function LoginPage(): JSX.Element {
  const nav = useNavigate();
  const [tab, setTab] = React.useState<"login" | "user" | "admin">("login");
  const [error, setError] = React.useState<string | null>(null);
  const [hasAdmin, setHasAdmin] = React.useState<boolean | null>(null);

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

  const handleLogin = loginForm.onSubmit(async ({ email, password }) => {
    setError(null);
    email = email.trim().toLowerCase();

    const resp = await login({ email, password });

    if (resp?.ok) {
      setCreds(email, password, resp.role);
    } else {
      setError(resp?.error || "Invalid credentials");
    }

    nav("/", { replace: true });
  });

  const handleAdminRegister = registerAdminForm.onSubmit(async ({ email, password }) => {
    setError(null);
    email = email.trim().toLowerCase();

    const regResp = await registerAdmin({ email, password });
    if (!regResp?.ok) return setError(regResp?.error || "Registration failed");

    const loginResp = await login({ email, password });
    if (loginResp?.ok) {
      setCreds(email, password, loginResp.role);
    } else {
      setCreds(email, password, "admin");
    }

    nav("/", { replace: true });
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
    if (loginResp?.ok) {
      setCreds(email, password, loginResp.role);
    } else {
      setCreds(email, password, "user");
    }

    nav("/", { replace: true });
  });

  if (hasAdmin === null) {
    return (
      <Center h="100vh">
        <Text size="sm">Loading…</Text>
      </Center>
    );
  }

  return (
    <Center h="100vh">
      <Card withBorder shadow="sm" radius="md" p="xl" w={480}>
        <Tabs value={tab} onChange={(v) => setTab(v as any)} keepMounted={false}>
          <Tabs.List grow>
            <Tabs.Tab value="login">Login</Tabs.Tab>
            <Tabs.Tab value="user" disabled={!hasAdmin}>
              Register User
            </Tabs.Tab>
            <Tabs.Tab value="admin" disabled={!!hasAdmin}>
              Register Admin
            </Tabs.Tab>
          </Tabs.List>

          {/* LOGIN TAB */}
          <Tabs.Panel value="login" pt="md">
            <form onSubmit={handleLogin}>
              <Stack>
                <TextInput label="Email" {...loginForm.getInputProps("email")} />
                <PasswordInput label="Password" {...loginForm.getInputProps("password")} />
                <Button type="submit">Log in</Button>
              </Stack>
            </form>
          </Tabs.Panel>

          {/* USER REGISTER TAB */}
          <Tabs.Panel value="user" pt="md">
            <form onSubmit={handleUserRegister}>
              <Stack>
                {!hasAdmin && (
                  <Alert color="yellow">An admin must exist before you can register.</Alert>
                )}
                <TextInput label="Email" {...registerUserForm.getInputProps("email")} />
                <PasswordInput
                  label="Password"
                  {...registerUserForm.getInputProps("password")}
                />
                <Button type="submit" disabled={!hasAdmin}>
                  Register
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>

          {/* ADMIN REGISTER TAB */}
          <Tabs.Panel value="admin" pt="md">
            <form onSubmit={handleAdminRegister}>
              <Stack>
                {hasAdmin && (
                  <Alert color="yellow">An admin already exists in this system.</Alert>
                )}
                <TextInput label="Admin Email" {...registerAdminForm.getInputProps("email")} />
                <PasswordInput
                  label="Admin Password"
                  {...registerAdminForm.getInputProps("password")}
                />
                <Button type="submit" disabled={!!hasAdmin}>
                  Create Admin
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>
        </Tabs>

        {error && (
          <>
            <Space h="md" />
            <Alert color="red">
              <Text size="sm">{error}</Text>
            </Alert>
          </>
        )}
      </Card>
    </Center>
  );
}
