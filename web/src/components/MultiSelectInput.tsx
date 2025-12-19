import { MultiSelect } from "@mantine/core";
import { IconEyeSearch, IconSearch } from "@tabler/icons-react";

type Props = {
    placeholder: string;
    group: string;
    width?: number;
    value: string[];
    data: { value: string; label: string }[];
    setData: (v: string[]) => void;
}

export function MultiSelectInput({ placeholder, group, data, value, width, setData }: Props) {
    const hasValue = value && value.length > 0;

    return (
        <MultiSelect
            w={width}
            clearable
            size="xs"
            radius="sm"
            value={value}
            onChange={setData}
            data={[{ group, items: data }]}
            placeholder={hasValue ? "selected!" : placeholder}
            leftSectionPointerEvents="none"
            leftSection={<IconSearch
                size={14}
                stroke={1.2}
                color={hasValue ? "var(--interlinked-color-secondary)" : undefined}
                aria-hidden
            />}
            variant={hasValue ? "filled" : "default"}
            nothingFoundMessage={`No ${placeholder.toLowerCase()} found`}
            styles={{
                input: { borderColor: hasValue ? "var(--interlinked-color-secondary)" : undefined },
                pill: { display: "none" }
            }}
        />
    );
}
