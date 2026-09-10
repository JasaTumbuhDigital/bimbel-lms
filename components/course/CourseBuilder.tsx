"use client";

import { useState } from "react";
import CourseInfoTab from "./CourseInfoTab";
import ModulesTab from "./ModulesTab";
import CourseAccessTab from "./CourseAccessTab";
import CourseEnrollmentTab from "./CourseEnrollmentTab";
import { Course, ClassLevel, TutorProfile, User } from "@prisma/client";

type TutorWithUser = TutorProfile & { user: User };

type EnrollmentData = {
    courseId: string;
    enrolledStudents: any[];
    unenrolledStudents: any[];
    classLevels: any[];
} | null;

export default function CourseBuilder({
    course,
    role,
    isOwner = false,
    availableClassLevels = [],
    availableTutors = [],
    enrollmentData = null,
}: {
    course: any,
    role: "admin" | "tutor",
    isOwner?: boolean,
    availableClassLevels?: ClassLevel[] | { id: string, name: string }[],
    availableTutors?: TutorWithUser[] | { id: string, user: { id: string, name: string } }[]
    enrollmentData?: EnrollmentData,
}) {
    const hasFullAccess = role === "admin" || isOwner;
    const [activeTab, setActiveTab] = useState<"info" | "modules" | "settings" | "enrollment">("modules");

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
                {hasFullAccess && enrollmentData && (
                    <button
                        onClick={() => setActiveTab("enrollment")}
                        className={`px-6 py-3 font-medium text-sm whitespace-nowrap flex items-center gap-1.5 ${activeTab === "enrollment" ? "border-b-2 border-green-600 text-green-600" : "text-gray-600 hover:text-gray-900"}`}
                    >
                        Peserta
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "enrollment" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                            {enrollmentData.enrolledStudents.length}
                        </span>
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

                {activeTab === "enrollment" && hasFullAccess && enrollmentData && (
                    <CourseEnrollmentTab initialData={enrollmentData} />
                )}
            </div>
        </div>
    );
}
