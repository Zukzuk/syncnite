import * as React from "react";
import {
  Card,
  Tabs,
  Stack,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Alert,
  Center,
  Space,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useForm } from "@mantine/form";
import { post } from "../lib/api";
import { API_ENDPOINTS } from "../lib/constants";
import { setCreds } from "../lib/persist";
import { fetchAdminStatus } from "../lib/api";

export default function LoginPage() {
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
    const res = await post(API_ENDPOINTS.LOGIN, {
      email: email.trim().toLowerCase(),
      password,
    });
    if (res?.ok) {
      setCreds(email, password, res.role);
      nav("/", { replace: true });
    } else setError(res?.error || "Invalid credentials");
  });

  const handleAdminRegister = registerAdminForm.onSubmit(async ({ email, password }) => {
    setError(null);
    const reg = await post(API_ENDPOINTS.ADMIN_REGISTER, {
      email: email.trim().toLowerCase(),
      password,
    });
    if (!reg?.ok) return setError(reg?.error || "Registration failed");

    const loginRes = await post(API_ENDPOINTS.LOGIN, { email, password });
    if (loginRes?.ok) setCreds(email, password, loginRes.role || "admin");
    else setCreds(email, password, "admin");
    nav("/", { replace: true });
  });

  const handleUserRegister = registerUserForm.onSubmit(async ({ email, password }) => {
    setError(null);
    const reg = await post(API_ENDPOINTS.USER_REGISTER, {
      email: email.trim().toLowerCase(),
      password,
    });
    if (!reg?.ok) {
      const msg =
        reg?.error === "no_admin_yet"
          ? "An admin must exist before you can register."
          : reg?.error === "user_exists"
          ? "User already exists."
          : reg?.error || "Registration failed";
      return setError(msg);
    }
    const loginRes = await post(API_ENDPOINTS.LOGIN, { email, password });
    if (loginRes?.ok) setCreds(email, password, loginRes.role || "user");
    else setCreds(email, password, "user");
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
