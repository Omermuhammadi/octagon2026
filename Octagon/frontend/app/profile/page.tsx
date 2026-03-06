"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { User, Mail, Calendar, Target, Award, Edit2, Save, X, Camera, Loader2, Dumbbell, Users, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, ProfileUpdateData } from "@/lib/api";
import { useRouter } from "next/navigation";

// === FAN/LEARNER OPTIONS ===
const fanExperienceLevels = ["Beginner", "Intermediate", "Advanced"];
const fanTrainingGoals = ["Learn MMA Basics", "Fitness & Conditioning", "Self-Defense", "Become a Fighter"];
const fanDisciplines = ["MMA", "BJJ", "Muay Thai", "Boxing", "Karate", "Wrestling", "Judo", "Taekwondo"];

// === COACH OPTIONS ===
const coachExperienceLevels = ["Certified Coach", "Head Coach", "Assistant Coach", "Guest Instructor"];
const coachSpecializations = ["Striking Coach", "Grappling Coach", "Strength & Conditioning", "Fight Strategy", "Full MMA Coach"];
const coachDisciplines = ["MMA", "BJJ", "Muay Thai", "Boxing", "Wrestling", "Kickboxing"];

// Map for API compatibility
const experienceLevelApiMap: Record<string, ProfileUpdateData['experienceLevel']> = {
    "Beginner": "Beginner",
    "Intermediate": "Intermediate", 
    "Advanced": "Advanced",
    "Certified Coach": "Professional",
    "Head Coach": "Professional",
    "Assistant Coach": "Advanced",
    "Guest Instructor": "Advanced"
};

const trainingGoalApiMap: Record<string, ProfileUpdateData['trainingGoal']> = {
    "Learn MMA Basics": "Fitness",
    "Fitness & Conditioning": "Fitness",
    "Self-Defense": "Self-Defense",
    "Become a Fighter": "Competition Preparation",
    "Striking Coach": "Professional Fighting",
    "Grappling Coach": "Professional Fighting",
    "Strength & Conditioning": "Professional Fighting",
    "Fight Strategy": "Professional Fighting",
    "Full MMA Coach": "Professional Fighting"
};

const disciplineApiMap: Record<string, ProfileUpdateData['discipline']> = {
    "MMA": "MMA",
    "BJJ": "BJJ",
    "Muay Thai": "Muay Thai",
    "Boxing": "Boxing",
    "Karate": "Karate",
    "Wrestling": "Wrestling",
    "Judo": "Karate",
    "Taekwondo": "Karate",
    "Kickboxing": "Muay Thai"
};

export default function ProfilePage() {
    const { user, token, refreshUser, isLoading } = useAuth();
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Determine if user is a coach or fan
    const isCoach = user?.role === 'coach';

    const [profile, setProfile] = useState({
        name: "",
        email: "",
        userType: "",
        joinDate: "",
        trainingGoal: "",  // For fans: learning goal, For coaches: specialization
        experienceLevel: "",
        weight: "",
        height: "",
        discipline: "",
        // Coach-specific fields
        yearsExperience: "",
        certifications: "",
        gymAffiliation: ""
    });

    const [editedProfile, setEditedProfile] = useState(profile);
    const [stats, setStats] = useState({
        predictionsMade: 0,
        trainingSessions: 0,
        accuracyRate: 0,
        daysActive: 0
    });

    // Load user data into profile state
    useEffect(() => {
        if (user) {
            const profileData = {
                name: user.name || "",
                email: user.email || "",
                userType: user.role === 'coach' ? 'Coach/Fighter' : 'Fan/Learner',
                joinDate: user.joinDate || "",
                trainingGoal: user.trainingGoal || (isCoach ? "Full MMA Coach" : "Learn MMA Basics"),
                experienceLevel: user.experienceLevel || (isCoach ? "Certified Coach" : "Beginner"),
                weight: user.weight || "",
                height: user.height || "",
                discipline: user.discipline || "MMA",
                yearsExperience: "",
                certifications: "",
                gymAffiliation: ""
            };
            setProfile(profileData);
            setEditedProfile(profileData);

            setStats({
                predictionsMade: user.predictionsMade || 0,
                trainingSessions: user.trainingSessions || 0,
                accuracyRate: user.accuracyRate || 0,
                daysActive: user.daysActive || 0
            });
        }
    }, [user, isCoach]);

    // Redirect if not logged in
    useEffect(() => {
        if (!isLoading && !token && !user) {
            router.push('/login');
        }
    }, [isLoading, token, user, router]);

    const handleSave = async () => {
        if (!token) return;

        setIsSaving(true);
        setSaveMessage(null);

        try {
            const updateData: ProfileUpdateData = {
                name: editedProfile.name,
                experienceLevel: experienceLevelApiMap[editedProfile.experienceLevel] || "Beginner",
                trainingGoal: trainingGoalApiMap[editedProfile.trainingGoal] || "Fitness",
                discipline: disciplineApiMap[editedProfile.discipline] || "MMA",
                weight: editedProfile.weight,
                height: editedProfile.height
            };

            await authApi.updateProfile(updateData, token);
            await refreshUser();
            setProfile(editedProfile);
            setIsEditing(false);
            setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (error) {
            console.error('Failed to update profile:', error);
            setSaveMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedProfile(profile);
        setIsEditing(false);
        setSaveMessage(null);
    };

    // Role-specific stats display
    const statsDisplay = isCoach ? [
        { label: "Athletes Trained", value: stats.trainingSessions.toString(), icon: Users },
        { label: "Sessions Given", value: stats.predictionsMade.toString(), icon: Dumbbell },
        { label: "Success Rate", value: `${stats.accuracyRate}%`, icon: Award },
        { label: "Days Active", value: stats.daysActive.toString(), icon: Calendar }
    ] : [
        { label: "Predictions Made", value: stats.predictionsMade.toString(), icon: Target },
        { label: "Training Sessions", value: stats.trainingSessions.toString(), icon: GraduationCap },
        { label: "Accuracy Rate", value: `${stats.accuracyRate}%`, icon: Award },
        { label: "Days Active", value: stats.daysActive.toString(), icon: Calendar }
    ];

    // Show loading state if user data not loaded yet
    if (isLoading || !user) {
        return (
            <div className="min-h-screen bg-black pt-24 px-4 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-octagon-red" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black pt-24 px-4 sm:px-6 lg:px-8 pb-12">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-display italic text-white mb-4">
                        YOUR <span className="text-octagon-red">PROFILE</span>
                    </h1>
                    <p className="text-gray-400">Manage your account and track your progress</p>
                </div>

                {/* Success/Error Message */}
                {saveMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mb-6 p-4 rounded-lg text-center ${
                            saveMessage.type === 'success' 
                                ? 'bg-green-500/20 border border-green-500/50 text-green-400' 
                                : 'bg-red-500/20 border border-red-500/50 text-red-400'
                        }`}
                    >
                        {saveMessage.text}
                    </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Profile Card */}
                    <div className="lg:col-span-1">
                        <Card variant="glass" className="p-6">
                            <div className="text-center mb-6">
                                <div className="relative inline-block mb-4">
                                    <div className="w-32 h-32 bg-gradient-to-br from-octagon-red to-octagon-gold octagon-avatar flex items-center justify-center">
                                        <User className="w-16 h-16 text-white" />
                                    </div>
                                    {isEditing && (
                                        <button className="absolute bottom-0 right-0 w-10 h-10 bg-octagon-red rounded-full flex items-center justify-center hover:bg-octagon-red/80 transition-colors">
                                            <Camera className="w-5 h-5 text-white" />
                                        </button>
                                    )}
                                </div>
                                <h2 className="text-2xl font-display text-white mb-1">{profile.name}</h2>
                                <p className="text-gray-400 text-sm">{profile.userType}</p>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-sm">
                                    <Mail className="w-4 h-4 text-octagon-gold" />
                                    <span className="text-gray-300">{profile.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Calendar className="w-4 h-4 text-octagon-gold" />
                                    <span className="text-gray-300">Joined {profile.joinDate}</span>
                                </div>
                            </div>

                            <Button
                                onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
                                variant={isEditing ? "ghost" : "primary"}
                                className="w-full"
                            >
                                {isEditing ? (
                                    <><X className="w-4 h-4 mr-2" /> Cancel</>
                                ) : (
                                    <><Edit2 className="w-4 h-4 mr-2" /> Edit Profile</>
                                )}
                            </Button>
                        </Card>

                        {/* Stats */}
                        <Card variant="glass" className="p-6 mt-6">
                            <h3 className="text-xl font-display uppercase text-white mb-4">Your Stats</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {statsDisplay.map((stat, idx) => (
                                    <div key={idx} className="text-center p-3 bg-white/5 rounded">
                                        <stat.icon className="w-6 h-6 text-octagon-gold mx-auto mb-2" />
                                        <div className="text-2xl font-display text-white mb-1">{stat.value}</div>
                                        <div className="text-xs text-gray-400">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Profile Details */}
                    <div className="lg:col-span-2">
                        <Card variant="glass" className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-display uppercase text-white">
                                    {isCoach ? 'Coach Profile' : 'Learner Profile'}
                                </h3>
                                {isEditing && (
                                    <Button onClick={handleSave} variant="primary" disabled={isSaving}>
                                        {isSaving ? (
                                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                        ) : (
                                            <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                                        )}
                                    </Button>
                                )}
                            </div>

                            {/* Role Badge */}
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 ${
                                isCoach 
                                    ? 'bg-octagon-gold/20 border border-octagon-gold/50 text-octagon-gold' 
                                    : 'bg-octagon-red/20 border border-octagon-red/50 text-octagon-red'
                            }`}>
                                {isCoach ? <Dumbbell className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                                <span className="text-sm font-bold uppercase">{profile.userType}</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Common Fields */}
                                <ProfileField
                                    label="Full Name"
                                    value={isEditing ? editedProfile.name : profile.name}
                                    isEditing={isEditing}
                                    onChange={(value) => setEditedProfile({ ...editedProfile, name: value })}
                                />
                                <ProfileField
                                    label="Email"
                                    value={profile.email}
                                    isEditing={false}
                                    onChange={() => {}}
                                    disabled={true}
                                />
                                
                                {/* Role-Specific Fields */}
                                {isCoach ? (
                                    <>
                                        {/* COACH FIELDS */}
                                        <ProfileField
                                            label="Coach Level"
                                            value={isEditing ? editedProfile.experienceLevel : profile.experienceLevel}
                                            isEditing={isEditing}
                                            onChange={(value) => setEditedProfile({ ...editedProfile, experienceLevel: value })}
                                            type="select"
                                            options={coachExperienceLevels}
                                        />
                                        <ProfileField
                                            label="Specialization"
                                            value={isEditing ? editedProfile.trainingGoal : profile.trainingGoal}
                                            isEditing={isEditing}
                                            onChange={(value) => setEditedProfile({ ...editedProfile, trainingGoal: value })}
                                            type="select"
                                            options={coachSpecializations}
                                        />
                                        <ProfileField
                                            label="Primary Discipline"
                                            value={isEditing ? editedProfile.discipline : profile.discipline}
                                            isEditing={isEditing}
                                            onChange={(value) => setEditedProfile({ ...editedProfile, discipline: value })}
                                            type="select"
                                            options={coachDisciplines}
                                        />
                                        <ProfileField
                                            label="Gym Affiliation"
                                            value={isEditing ? editedProfile.gymAffiliation : profile.gymAffiliation}
                                            isEditing={isEditing}
                                            onChange={(value) => setEditedProfile({ ...editedProfile, gymAffiliation: value })}
                                            placeholder="e.g., AKA, ATT, Jackson-Wink"
                                        />
                                    </>
                                ) : (
                                    <>
                                        {/* FAN/LEARNER FIELDS */}
                                        <ProfileField
                                            label="Experience Level"
                                            value={isEditing ? editedProfile.experienceLevel : profile.experienceLevel}
                                            isEditing={isEditing}
                                            onChange={(value) => setEditedProfile({ ...editedProfile, experienceLevel: value })}
                                            type="select"
                                            options={fanExperienceLevels}
                                        />
                                        <ProfileField
                                            label="Learning Goal"
                                            value={isEditing ? editedProfile.trainingGoal : profile.trainingGoal}
                                            isEditing={isEditing}
                                            onChange={(value) => setEditedProfile({ ...editedProfile, trainingGoal: value })}
                                            type="select"
                                            options={fanTrainingGoals}
                                        />
                                        <ProfileField
                                            label="Interested Discipline"
                                            value={isEditing ? editedProfile.discipline : profile.discipline}
                                            isEditing={isEditing}
                                            onChange={(value) => setEditedProfile({ ...editedProfile, discipline: value })}
                                            type="select"
                                            options={fanDisciplines}
                                        />
                                        <ProfileField
                                            label="Weight"
                                            value={isEditing ? editedProfile.weight : profile.weight}
                                            isEditing={isEditing}
                                            onChange={(value) => setEditedProfile({ ...editedProfile, weight: value })}
                                            placeholder="e.g., 170 lbs"
                                        />
                                        <ProfileField
                                            label="Height"
                                            value={isEditing ? editedProfile.height : profile.height}
                                            isEditing={isEditing}
                                            onChange={(value) => setEditedProfile({ ...editedProfile, height: value })}
                                            placeholder="e.g., 5ft 11in"
                                        />
                                    </>
                                )}
                            </div>
                        </Card>

                        {/* Recent Activity */}
                        <Card variant="glass" className="p-8 mt-6">
                            <h3 className="text-2xl font-display uppercase text-white mb-6">Recent Activity</h3>
                            <div className="space-y-4">
                                <ActivityItem
                                    action="Completed training module"
                                    detail="Week 2: Striking Fundamentals"
                                    time="2 hours ago"
                                />
                                <ActivityItem
                                    action="Made a prediction"
                                    detail="Edwards vs Covington - UFC 296"
                                    time="1 day ago"
                                />
                                <ActivityItem
                                    action="Compared fighters"
                                    detail="Conor McGregor vs Khabib Nurmagomedov"
                                    time="2 days ago"
                                />
                                <ActivityItem
                                    action="Form analysis session"
                                    detail="Jab technique - Score: 85%"
                                    time="3 days ago"
                                />
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProfileField({
    label,
    value,
    isEditing,
    onChange,
    type = "text",
    options = [],
    placeholder = "",
    disabled = false
}: {
    label: string;
    value: string;
    isEditing: boolean;
    onChange: (value: string) => void;
    type?: "text" | "select";
    options?: string[];
    placeholder?: string;
    disabled?: boolean;
}) {
    return (
        <div>
            <label className="block text-sm font-heading uppercase text-gray-400 mb-2">{label}</label>
            {isEditing && !disabled ? (
                type === "select" ? (
                    <select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-octagon-red transition-colors"
                    >
                        {options.map((option) => (
                            <option key={option} value={option} className="bg-neutral-900">
                                {option}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:border-octagon-red transition-colors"
                    />
                )
            ) : (
                <div className={`w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {value || <span className="text-gray-500">{placeholder || 'Not set'}</span>}
                </div>
            )}
        </div>
    );
}

function ActivityItem({ action, detail, time }: { action: string; detail: string; time: string }) {
    return (
        <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
            <div className="w-2 h-2 bg-octagon-red rounded-full mt-2 flex-shrink-0" />
            <div className="flex-1">
                <p className="text-white font-bold text-sm">{action}</p>
                <p className="text-gray-400 text-sm">{detail}</p>
            </div>
            <span className="text-xs text-gray-500">{time}</span>
        </div>
    );
}
