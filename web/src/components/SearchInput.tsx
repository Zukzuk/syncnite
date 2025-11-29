import { ActionIcon, TextInput } from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";

type Props = {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    width?: number | string;
}

export function SearchInput({ value, onChange }: Props) {
    return (
        <TextInput
            placeholder="Search…"
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            w={219}
            size="xs"
            radius="sm"
            variant={!!value ? "filled" : "default"}
            leftSection={<IconSearch size={16} stroke={2} aria-hidden />}
            leftSectionPointerEvents="none"
            rightSection={
                value ? (
                    <ActionIcon
                        size="sm"
                        variant="subtle"
                        aria-label="Clear search"
                        onClick={() => onChange("")}
                        title="Clear"
                    >
                        <IconX size={16} stroke={2} />
                    </ActionIcon>
                ) : null
            }
        />
    );
}
