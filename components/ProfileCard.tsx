import { Image } from "expo-image";
import { Dimensions, Text, View } from "react-native";
import { getFlagByName } from "../lib/countries";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 32;

function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export default function ProfileCard({
  profile,
  isPreview = false,
  showDetails = true,
}: any) {
  const photos = profile.photos || [];

  const fullName = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.name || "Unknown";

  const age = calculateAge(profile.dob);

  return (
    <View
      className="bg-white/10 rounded-3xl overflow-hidden"
      style={isPreview ? { width: '100%' } : { width: CARD_WIDTH, flex: 1 }}
    >
      {/* All Photos in Vertical Scroll */}
      {photos.length > 0 ? (
        photos.map((photo: string, index: number) => (
          <View
            key={index}
            style={{
              width: '100%',
              height: isPreview ? Dimensions.get('window').height * 0.75 : 400,
              position: 'relative'
            }}
          >
            <Image
              source={{ uri: photo }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
              priority={index === 0 ? "high" : "normal"}
            />

            {/* Show name and age only on first photo */}
            {index === 0 && (
              <>
                {/* Gradient Overlay for better text readability */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 120,
                    backgroundColor: 'rgba(0,0,0,0.6)'
                  }}
                />

                {/* Name and Age on Bottom Left */}
                <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                  <View className="flex-row items-baseline gap-2">
                    <Text className="text-white text-3xl font-bold">
                      {fullName}
                    </Text>
                    {age !== null && (
                      <Text className="text-white/90 text-2xl">
                        {age}
                      </Text>
                    )}
                  </View>
                </View>
              </>
            )}
          </View>
        ))
      ) : (
        /* If no photos, show placeholder */
        <View style={{ width: '100%', height: isPreview ? Dimensions.get('window').height * 0.75 : 400, justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
          <View className="w-full h-full bg-white/5 items-center justify-center">
            <Text className="text-white/60 text-2xl">👤</Text>
          </View>
          {/* Name and Age overlay even without photo */}
          <View style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
            <View className="flex-row items-baseline gap-2">
              <Text className="text-white text-3xl font-bold">
                {fullName}
              </Text>
              {age !== null && (
                <Text className="text-white/90 text-2xl">
                  {age}
                </Text>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Profile Details Section (hidden on swipe cards when showDetails=false) */}
      {showDetails && (
        <View className="p-4" style={{ gap: 16, paddingBottom: 20 }}>
          {/* Bio */}
          {profile.bio && (
            <View>
              <Text className="text-white text-base leading-6">
                {profile.bio}
              </Text>
            </View>
          )}

          {/* Key Details */}
          <View style={{ gap: 12 }}>
            {/* Height */}
            {profile.height && (
              <View className="flex-row items-center gap-2">
                <Text className="text-white/70 text-base">📏</Text>
                <Text className="text-white/90 text-base">{profile.height}</Text>
              </View>
            )}

            {/* Location */}
            {(profile.city || profile.country || profile.location) && (
              <View className="flex-row items-center gap-2">
                <Text className="text-white/70 text-base">
                  {getFlagByName(profile.country || "") || "📍"}
                </Text>
                <Text className="text-white/90 text-base">
                  {profile.city || profile.country
                    ? `${profile.city || ''}${profile.city && profile.country ? ', ' : ''}${profile.country || ''}`
                    : "Nearby"}
                </Text>
              </View>
            )}

            {/* Marital Status */}
            {profile.marital_status && (
              <View className="flex-row items-center gap-2">
                <Text className="text-white/70 text-base">💍</Text>
                <Text className="text-white/90 text-base capitalize">{profile.marital_status}</Text>
              </View>
            )}

            {/* Children */}
            {profile.has_children !== null && (
              <View className="flex-row items-center gap-2">
                <Text className="text-white/70 text-base">👶</Text>
                <Text className="text-white/90 text-base">
                  {profile.has_children ? "Has children" : "No children"}
                </Text>
              </View>
            )}

            {/* Education */}
            {profile.education && (
              <View className="flex-row items-center gap-2">
                <Text className="text-white/70 text-base">🎓</Text>
                <Text className="text-white/90 text-base">{profile.education}</Text>
              </View>
            )}

            {/* Profession */}
            {profile.profession && (
              <View className="flex-row items-center gap-2">
                <Text className="text-white/70 text-base">💼</Text>
                <Text className="text-white/90 text-base">{profile.profession}</Text>
              </View>
            )}

            {/* Ethnicity & Nationality */}
            {(profile.ethnicity || profile.nationality) && (
              <View className="flex-row items-center gap-2">
                <Text className="text-white/70 text-base">
                  {profile.nationality ? (getFlagByName(profile.nationality) || "🌍") : "🌍"}
                </Text>
                <Text className="text-white/90 text-base">
                  {[profile.ethnicity, profile.nationality].filter(Boolean).join(" • ")}
                </Text>
              </View>
            )}


          </View>
        </View>
      )}
    </View>
  );
}
