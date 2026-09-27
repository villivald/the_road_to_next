"use client";

import { useDebouncedCallback } from "use-debounce";
import { Input } from "./ui/input";

type SearchInputProps = {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

const SearchInput = ({ value, placeholder, onChange }: SearchInputProps) => {
  const handleSearch = useDebouncedCallback((search: string) => {
    onChange(search);
  }, 250);

  return (
    <Input
      defaultValue={value}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(event) => handleSearch(event.target.value)}
    />
  );
};
export default SearchInput;
