"use client";

import { useState, useRef, useEffect } from "react";
import { searchBlogTagsAction } from "@/lib/actions/blog";

interface Tag {
    id: string;
    name: string;
}

interface TagAutocompleteProps {
    initialTags?: string[];
    onTagsChange: (tags: string[]) => void;
}

export default function TagAutocomplete({ initialTags = [], onTagsChange }: TagAutocompleteProps) {
    const [tags, setTags] = useState<string[]>(initialTags);
    const [inputValue, setInputValue] = useState("");
    const [suggestions, setSuggestions] = useState<Tag[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchSuggestions = async (query: string) => {
        const result = await searchBlogTagsAction(query);
        if (result.success && result.data) {
            setSuggestions(result.data);
            setIsDropdownOpen(true);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        if (value.trim().length > 0) {
            fetchSuggestions(value);
        } else {
            setIsDropdownOpen(false);
        }
    };

    const addTag = (tagName: string) => {
        const name = tagName.trim();
        if (name && !tags.includes(name)) {
            const newTags = [...tags, name];
            setTags(newTags);
            onTagsChange(newTags);
        }
        setInputValue("");
        setIsDropdownOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    const removeTag = (tagToRemove: string) => {
        const newTags = tags.filter(tag => tag !== tagToRemove);
        setTags(newTags);
        onTagsChange(newTags);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="flex flex-wrap gap-2 p-2 border border-slate-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                {tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-md">
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                            &times;
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? "Ketik lalu tekan Enter atau koma" : ""}
                    className="flex-1 min-w-30 outline-none text-sm bg-transparent"
                    onFocus={() => {
                        if (inputValue.trim().length > 0) {
                            fetchSuggestions(inputValue);
                        }
                    }}
                />
            </div>

            {/* Input Hidden untuk Server Action */}
            {tags.map(tag => (
                <input key={tag} type="hidden" name="tagNames" value={tag} />
            ))}

            {isDropdownOpen && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    <ul className="py-1">
                        {suggestions.map(suggestion => (
                            <li
                                key={suggestion.id}
                                onClick={() => addTag(suggestion.name)}
                                className="px-3 py-2 text-sm hover:bg-slate-100 cursor-pointer text-slate-700"
                            >
                                {suggestion.name}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
