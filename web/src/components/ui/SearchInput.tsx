import { ActionIcon, TextInput } from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";

type Props = {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    width?: number | string;
}

export function SearchInput({ value, onChange, placeholder = "Search…", width = 475 }: Props) {
    return (
        <TextInput
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            w={width}
            size="sm"
            radius="xl"
            variant="filled"
            leftSection={<IconSearch size={18} stroke={2} aria-hidden />}
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
