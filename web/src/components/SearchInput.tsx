import { ActionIcon, TextInput } from "@mantine/core";
import { IconSearch, IconX } from "@tabler/icons-react";

type Props = {
    value: string;
    placeholder?: string;
    width?: number;
    onChange: (v: string) => void;
}

export function SearchInput({ 
    value, width, onChange 
}: Props) {
    const hasValue = !!value;

    return (
        <TextInput
            placeholder="Search…"
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            w={width}
            size="xs"
            radius="sm"
            variant={hasValue ? "filled" : "default"}
            leftSectionPointerEvents="none"
            leftSection={<IconSearch 
                size={14} 
                stroke={hasValue ? 1.6 : 1.2} 
                color={ hasValue ? "var(--interlinked-color-secondary)" : undefined }
                aria-hidden 
            />}
            rightSection={
                hasValue ? (
                    <ActionIcon
                        size="sm"
                        variant="transparent"
                        aria-label="Clear search"
                        onClick={() => onChange("")}
                        color="var(--mantine-color-text)"
                        title="Clear"
                    >
                        <IconX size={14} stroke={1.2} aria-hidden />
                    </ActionIcon>
                ) : null
            }
            styles={{ 
                input: { borderColor: hasValue ? "var(--interlinked-color-secondary)" : undefined }
            }}
        />
    );
}
