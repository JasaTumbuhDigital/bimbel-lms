"use client";

import { useState } from "react";
import CourseInfoTab from "./CourseInfoTab";
import ModulesTab from "./ModulesTab";
import CourseAccessTab from "./CourseAccessTab";
import { Course, ClassLevel, TutorProfile, User } from "@prisma/client";

type TutorWithUser = TutorProfile & { user: User };

export default function CourseBuilder({
    course,
    role,
    isOwner = false,
    availableClassLevels = [],
    availableTutors = []
}: {
    course: any,
    role: "admin" | "tutor",
    isOwner?: boolean,
    availableClassLevels?: ClassLevel[] | { id: string, name: string }[],
    availableTutors?: TutorWithUser[] | { id: string, user: { id: string, name: string } }[]
}) {
    const hasFullAccess = role === "admin" || isOwner;
    const [activeTab, setActiveTab] = useState<"info" | "modules" | "settings">("modules");

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Tabs Navigation */}
            <div className="flex border-b overflow-x-auto">
                {hasFullAccess && (
                    <button
                        onClick={() => setActiveTab("info")}
                        className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === "info" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-gray-900"}`}
                    >
                        Informasi Dasar
                    </button>
                )}
                <button
                    onClick={() => setActiveTab("modules")}
                    className={`px-6 py-3 font-medium text-sm whitespace-nowrap ${activeTab === "modules" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-600 hover:text-gray-900"}`}
                >
                    Materi & Modul
                </button>
                {hasFullAccess && (
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

                {activeTab === "settings" && hasFullAccess && (
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
