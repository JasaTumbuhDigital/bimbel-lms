"use client";

import { useState } from "react";
import CourseInfoTab from "./CourseInfoTab";
import ModulesTab from "./ModulesTab";
import CourseAccessTab from "./CourseAccessTab";

export default function CourseBuilder({
    course,
    role,
    availableClassLevels = [],
    availableTutors = []
}: {
    course: any,
    role: "admin" | "tutor",
    availableClassLevels?: any[],
    availableTutors?: any[]
}) {
    const [activeTab, setActiveTab] = useState<"info" | "modules" | "settings">("modules");

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Tabs Navigation */}
            <div className="flex border-b overflow-x-auto">
                <button
                    onClick={() => setActiveTab("info")}
                    className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === "info" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-gray-900"}`}
                >
                    Informasi Dasar
                </button>
                <button
                    onClick={() => setActiveTab("modules")}
                    className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === "modules" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-gray-900"}`}
                >
                    Materi & Modul
                </button>
                {role === "admin" && (
                    <button
                        onClick={() => setActiveTab("settings")}
                        className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === "settings" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-gray-900"}`}
                    >
                        Pengaturan Akses
                    </button>
                )}
            </div>

            <div className="p-6">
                {activeTab === "info" && (
                    <CourseInfoTab course={course} role={role} />
                )}

                {activeTab === "modules" && (
                    <ModulesTab course={course} />
                )}

                {activeTab === "settings" && role === "admin" && (
                    <CourseAccessTab
                        course={course}
                        availableClassLevels={availableClassLevels}
                        availableTutors={availableTutors}
                    />
                )}
            </div>
        </div>
    );
}
