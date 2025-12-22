import { MultiSelect } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { InterLinkedOrigin } from "../types/interlinked";

type Props = {
    placeholder: string;
    group: InterLinkedOrigin;
    width?: number;
    value: string[];
    data: { value: string; label: string }[];
    setData: (v: string[]) => void;
}

export function MultiSelectInput({ placeholder, group, data, value, width = 131, setData }: Props) {
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
                stroke={hasValue ? 1.6 : 1.2}
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
