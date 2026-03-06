export interface Fighter {
    id: string;
    name: string;
    nickname: string;
    image: string;
    division: string;
    status: "Champion" | "Contender" | "Rising Star" | "Legend";
}

export const TOP_CONTENDERS: Fighter[] = [
    {
        id: "1",
        name: "Ilia Topuria",
        nickname: "El Matador",
        image: "/images/topuria.png",
        division: "Featherweight",
        status: "Champion"
    },
    {
        id: "2",
        name: "Sean O'Malley",
        nickname: "Suga",
        image: "/images/sean.png",
        division: "Bantamweight",
        status: "Champion"
    },
    {
        id: "3",
        name: "Khamzat Chimaev",
        nickname: "Borz",
        image: "/images/khamzat.png",
        division: "Middleweight",
        status: "Contender"
    },
    {
        id: "4",
        name: "Islam Makhachev",
        nickname: "The Champion",
        image: "/images/islam.png",
        division: "Lightweight",
        status: "Champion"
    }
];
