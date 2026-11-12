import type {Metadata} from "next";
import {LoginScreen} from "@/features/login";

export const metadata:Metadata={title:"Login Kairós | Formação Teológica"};
export default function LoginPage(){return <LoginScreen/>;}
