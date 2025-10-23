import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  DesktopIcon,
  EnvelopeClosedIcon,
  FrameIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import GLOBAL_STATE from "../state";
import STORE from "../store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import { Label } from "@/components/ui/label.jsx";
import { useNavigate } from "react-router-dom";
import { CopyPlusIcon } from "lucide-react";
import NewObjectEditorDialog from "./NewObjectEdiorDialog";
import { Edit2Icon } from "lucide-react";
import { useParams } from "react-router-dom";

const useForm = () => {
  const { modeParam } = useParams()
  let mm = 0
  if (!modeParam || modeParam === 0) {
    mm = 1
  } else {
    mm = modeParam
  }
  const [inputs, setInputs] = useState({});
  const [tokenLogin, setTokenLogin] = useState(false);
  const [errors, setErrors] = useState({});
  const [mode, setMode] = useState(Number(mm));
  const [remember, setRememeber] = useState(false);
  const state = GLOBAL_STATE("login");
  const [authServer, setAuthServer] = useState()
  const navigate = useNavigate()
  const [newAuth, setNewAuth] = useState({
    ID: uuidv4(),
    Host: "",
    Port: "",
    HTTPS: true,
    ValidateCertificate: true,
    CertificatePath: "",
  })
  const [modalOpen, setModalOpen] = useState(false)

  const changeAuthServer = (id) => {
    console.log("changing auth servers to:", id)
    state.Config?.ControlServers?.forEach(s => {
      if (s.ID === id) {
        console.log("new auth server:", id)
        setAuthServer(s)
      }
    })

  }

  const RemoveToken = () => {
    setTokenLogin(false);
    errors["email"] = "";
    setErrors({ ...errors });
    setInputs((inputs) => ({ ...inputs, ["email"]: "" }));
  };

  const GenerateToken = () => {
    let token = uuidv4();
    setTokenLogin(true);

    setErrors({ ...errors });
    setInputs((inputs) => ({ ...inputs, ["email"]: token }));
  };

  const saveNewAuth = () => {
    let found = false
    state.Config?.ControlServers?.forEach((s, i) => {
      if (s.ID === newAuth.ID) {
        state.Config.ControlServers[i] = { ...newAuth }
        found = true
      }
    })

    if (!found) {
      state.Config.ControlServers.push(newAuth)
    }

    state.v2_ConfigSave()
  }

  const RegisterSubmit = async () => {
    let errors = {};
    let hasErrors = false;

    if (!inputs["email"]) {
      errors["email"] = "Email / Token missing";
      hasErrors = true;
    }

    if (inputs["email"]) {
      if (inputs["email"].length > 320) {
        errors["email"] = "Maximum 320 characters";
        hasErrors = true;
      }

      if (!tokenLogin) {
        if (!inputs["email"].includes(".") || !inputs["email"].includes("@")) {
          errors["email"] = "Invalid email format";
          hasErrors = true;
        }
      }
    }

    if (!inputs["password"]) {
      errors["password"] = "Password missing";
      hasErrors = true;
    }
    if (!inputs["password2"]) {
      errors["password2"] = "Password confirm missing";
      hasErrors = true;
    }

    if (inputs["password"] !== inputs["password2"]) {
      errors["password2"] = "Passwords do not match";
      hasErrors = true;
    }

    if (inputs["password"]) {
      if (inputs["password"].length < 10) {
        errors["password"] = "Minimum 10 characters";
        hasErrors = true;
      }
      if (inputs["password"].length > 255) {
        errors["password"] = "Maximum 255 characters";
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setErrors({ ...errors });
      return;
    }


    let x = await state.callController(authServer, "POST", "/v3/user/create", inputs, true, false)
    if (x.status === 200) {
      state.v2_SetUser(x.data, remember, authServer);
      navigate("/servers")
      return
    }
    setErrors({});
  };

  const HandleSubmit = async () => {
    let errors = {};
    let hasErrors = false;

    if (!inputs["email"] || inputs["email"] === "") {
      errors["email"] = "Email / Token missing";
      hasErrors = true;
    }

    if (!inputs["password"] || inputs["password"] === "") {
      errors["password"] = "Password missing";
      hasErrors = true;
    }

    if (mode === 1) {
      if (!inputs["devicename"] || inputs["devicename"] === "") {
        errors["devicename"] = "Device login name missing";
        hasErrors = true;
      }
    }

    if (mode === 2) {
      if (!inputs["digits"] || inputs["digits"] === "") {
        errors["digits"] = "Authenticator code missing";
        hasErrors = true;
      }

      if (inputs["digits"] && inputs["digits"].length < 6) {
        errors["digits"] = "Code needs to be at least 6 digits";
        hasErrors = true;
      }
    }

    if (mode === 3) {
      if (!inputs["recovery"] || inputs["recovery"] === "") {
        errors["recovery"] = "Recovery code missing";
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setErrors({ ...errors });
      return;
    }

    let x = await state.callController(authServer, "POST", "/v3/user/login", inputs, true, false)
    if (x && x.status === 200) {
      STORE.Cache.Set("default-device-name", inputs["devicename"]);
      STORE.Cache.Set("default-email", inputs["email"]);
      state.v2_SetUser(x.data, remember, authServer);
      if (mode === 3) {
        navigate("/twofactor/recover")
      } else {
        navigate("/servers")
      }
      return
    }
    setErrors({});
  };

  const EnableSubmit = async () => {
    let errors = {};
    let hasErrors = false;

    if (!inputs["email"]) {
      errors["email"] = "Email / Token missing";
      hasErrors = true;
    }

    if (inputs["email"]) {
      if (!inputs["email"].includes(".") || !inputs["email"].includes("@")) {
        errors["email"] = "Email address format is incorrect";
        hasErrors = true;
      }
    }

    if (!inputs["code"]) {
      errors["code"] = "code missing";
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors({ ...errors });
      return;
    }

    let request = {
      Email: inputs["email"],
      ConfirmCode: inputs["code"],
    };

    let x = await state.callController(authServer, "POST", "/v3/user/enable", request, true, false)
    if (x.status === 200) {
      inputs["code"] = "";
      setInputs({ ...inputs });
      setMode(6);
    }
    setErrors({});
  };

  const ResetSubmit = async () => {
    let errors = {};
    let hasErrors = false;

    if (!inputs["email"]) {
      errors["email"] = "Email / Token missing";
      hasErrors = true;
    }

    if (!inputs["password"]) {
      errors["password"] = "Password missing";
      hasErrors = true;
    }

    if (inputs["password"] && inputs["password"].length < 9) {
      errors["password"] =
        "Password needs to be at least 9 characters in length";
      hasErrors = true;
    }

    if (inputs["password"] && inputs["password"].length > 255) {
      errors["password"] = "Password can not be longer then 255 characters";
      hasErrors = true;
    }

    if (!inputs["password2"]) {
      errors["password2"] = "Password confirmation missing";
      hasErrors = true;
    }

    if (inputs["password"] !== inputs["password2"]) {
      errors["password"] = "Passwords do not match";
      hasErrors = true;
    }

    if (!inputs["code"]) {
      errors["code"] = "code missing";
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors({ ...errors });
      return;
    }

    let request = {
      Email: inputs["email"],
      Password: inputs["password"],
      ResetCode: inputs["code"],
      UseTwoFactor: inputs["usetwofactor"] ? inputs["usetwofactor"] : false
    };

    let x = await state.callController(authServer, "POST", "/v3/user/reset/password", request, true, false)
    if (x.status === 200) {
      inputs["password"] = "";
      inputs["password2"] = "";
      inputs["code"] = "";
      setInputs({ ...inputs });
      setMode(1);
    }
    setErrors({});
  };

  const GetCode = async () => {
    let errors = {};
    let hasErrors = false;

    if (!inputs["email"]) {
      errors["email"] = "Email missing";
      hasErrors = true;
    }

    if (inputs["email"]) {
      if (!inputs["email"].includes(".") || !inputs["email"].includes("@")) {
        errors["email"] = "Email address format is incorrect";
        hasErrors = true;
      }
    }

    if (hasErrors) {
      setErrors({ ...errors });
      return;
    }

    let request = {
      Email: inputs["email"],
    };

    let x = await state.callController(authServer, "POST", "/v3/user/reset/code", request, true, false)
    if (x.status === 200) {
      state.successNotification("reset code sent")
    }
    setErrors({});
  };

  const HandleInputChange = (event) => {
    setInputs((inputs) => ({
      ...inputs,
      [event.target.name]: event.target.value,
    }));
  };

  return {
    state,
    remember,
    setRememeber,
    inputs,
    setInputs,
    HandleInputChange,
    HandleSubmit,
    errors,
    setMode,
    mode,
    RegisterSubmit,
    GenerateToken,
    tokenLogin,
    ResetSubmit,
    GetCode,
    RemoveToken,
    EnableSubmit,
    authServer,
    modalOpen,
    setModalOpen,
    newAuth,
    setNewAuth,
    saveNewAuth,
    changeAuthServer
  };
};

const Login = (props) => {
  const {
    state,
    remember,
    setRememeber,
    inputs,
    setInputs,
    HandleInputChange,
    HandleSubmit,
    errors,
    setMode,
    mode,
    RegisterSubmit,
    GenerateToken,
    tokenLogin,
    ResetSubmit,
    GetCode,
    RemoveToken,
    EnableSubmit,
    authServer,
    modalOpen,
    setModalOpen,
    newAuth,
    setNewAuth,
    saveNewAuth,
    changeAuthServer
  } = useForm(props);

  const GetDefaults = async () => {
    await state.GetBackendState();
    changeAuthServer(state.Config?.ControlServers[0]?.ID)
    let i = { ...inputs };

    let defaultDeviceName = STORE.Cache.Get("default-device-name");
    if (defaultDeviceName) {
      i["devicename"] = defaultDeviceName;
    }

    let defaultEmail = STORE.Cache.Get("default-email");
    if (defaultEmail) {
      i["email"] = defaultEmail;
    }

    setInputs(i);
  };

  useEffect(() => {
    GetDefaults();
  }, []);

  const EmailInput = () => {
    return (
      <div className="space-y-2">
        <div className="relative">
          <EnvelopeClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-[#4B7BF5]" />
          <Input
            id="email"
            className="pl-10 bg-[#0B0E14] border-[#1a1f2d] text-white focus:ring-[#4B7BF5] focus:border-[#4B7BF5] h-11"
            type="email"
            placeholder="Email / Token"
            value={inputs["email"]}
            name="email"
            onChange={HandleInputChange}
          />
        </div>
        {errors["email"] !== "" && (
          <p className="text-sm text-red-500">{errors["email"]}</p>
        )}
      </div>
    );
  };

  const DeviceInput = () => {
    return (
      <div className="space-y-2">
        <div className="relative">
          <DesktopIcon className="absolute left-3 top-2.5 h-5 w-5 text-[#4B7BF5]" />
          <Input
            id="devicename"
            className="pl-10 bg-[#0B0E14] border-[#1a1f2d] text-white focus:ring-[#4B7BF5] focus:border-[#4B7BF5] h-11"
            type="text"
            placeholder="Device Name"
            value={inputs["devicename"]}
            name="devicename"
            onChange={HandleInputChange}
          />
        </div>
        {errors["devicename"] && (
          <p className="text-sm text-red-500">{errors["devicename"]}</p>
        )}
      </div>
    );
  };

  const PasswordInput = () => {
    return (
      <div className="space-y-2">
        <div className="relative">
          <LockClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-[#4B7BF5]" />
          <Input
            id="password"
            className="pl-10 bg-[#0B0E14] border-[#1a1f2d] text-white focus:ring-[#4B7BF5] focus:border-[#4B7BF5] h-11"
            type="password"
            placeholder="Password"
            value={inputs["password"]}
            name="password"
            onChange={HandleInputChange}
          />
        </div>
        {errors["password"] && (
          <p className="text-sm text-red-500">{errors["password"]}</p>
        )}
      </div>
    );
  };

  const TwoFactorInput = () => {
    return (
      <div className="space-y-2">
        <div className="relative">
          <LockClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-[#4B7BF5]" />
          <Input
            id="digits"
            className="pl-10 bg-[#0B0E14] border-[#1a1f2d] text-white focus:ring-[#4B7BF5] focus:border-[#4B7BF5] h-11"
            type="text"
            placeholder="Authenticator Code (optional)"
            value={inputs["digits"]}
            name="digits"
            onChange={HandleInputChange}
          />
        </div>
        {errors["digits"] && (
          <p className="text-sm text-red-500">{errors["digits"]}</p>
        )}
      </div>
    );
  };

  const ConfirmPasswordInput = () => {
    return (
      <div className="space-y-2">
        <div className="relative">
          <LockClosedIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          <Input
            id="password2"
            className="pl-10"
            type="password"
            placeholder="Confirm Password"
            value={inputs["password2"]}
            name="password2"
            onChange={HandleInputChange}
          />
        </div>
        {errors["password2"] && (
          <p className="text-sm text-destructive">{errors["password2"]}</p>
        )}
      </div>
    );
  };

  const TokenInput = () => {
    return (
      <div className="space-y-2">
        <div className="relative">
          <FrameIcon className="absolute left-3 top-2.5 h-5 w-5 text-[#4B7BF5]" />
          <Input
            id="token"
            className="pl-10 bg-[#0B0E14] border-[#1a1f2d] text-white focus:ring-[#4B7BF5] focus:border-[#4B7BF5] h-11"
            type="text"
            placeholder="Token"
            value={inputs["email"]}
            name="email"
            onChange={HandleInputChange}
          />
        </div>
        {inputs["email"] && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription className="font-semibold">
              SAVE THIS TOKEN!
            </AlertDescription>
          </Alert>
        )}
        {errors["email"] && (
          <p className="text-sm text-red-500">{errors["email"]}</p>
        )}
      </div>
    );
  };

  const CodeInput = () => {
    return (
      <div className="space-y-2">
        <div className="relative">
          <FrameIcon className="absolute left-3 top-2.5 h-5 w-5 text-[#4B7BF5]" />
          <Input
            id="code"
            className="pl-10 bg-[#0B0E14] border-[#1a1f2d] text-white focus:ring-[#4B7BF5] focus:border-[#4B7BF5] h-11"
            type="text"
            placeholder="Code"
            name="code"
            onChange={HandleInputChange}
          />
        </div>
        {errors["code"] && (
          <p className="text-sm text-red-500">{errors["code"]}</p>
        )}
      </div>
    );
  };

  const ResetTwoFactorCodeInput = () => {
    return (
      <div className="space-y-2">
        <div className="relative">
          <FrameIcon className="absolute left-3 top-2.5 h-5 w-5 text-[#4B7BF5]" />
          <Input
            id="code"
            className="pl-10 bg-[#0B0E14] border-[#1a1f2d] text-white focus:ring-[#4B7BF5] focus:border-[#4B7BF5] h-11"
            type="text"
            placeholder="Two-Factor Auth Code"
            name="code"
            onChange={HandleInputChange}
          />
        </div>
        {errors["code"] && (
          <p className="text-sm text-red-500">{errors["code"]}</p>
        )}
      </div>
    );
  };

  const RecoveryInput = () => {
    return (
      <div className="space-y-2">
        <div className="relative">
          <FrameIcon className="absolute left-3 top-2.5 h-5 w-5 text-[#4B7BF5]" />
          <Input
            id="recovery"
            className="pl-10 bg-[#0B0E14] border-[#1a1f2d] text-white focus:ring-[#4B7BF5] focus:border-[#4B7BF5] h-11"
            type="text"
            placeholder="Two Factor Recovery Code"
            value={inputs["recovery"]}
            name="recovery"
            onChange={HandleInputChange}
          />
        </div>
        {errors["recovery"] && (
          <p className="text-sm text-red-500">{errors["recovery"]}</p>
        )}
      </div>
    );
  };

  const selectForm = () => {
    if (state === undefined) {
      return (<></>)
    }
    let opts = []
    let tunID = ""
    state.Config?.ControlServers?.forEach(s => {
      if (s.Host.includes("api.tunnels.is")) {
        tunID = s.ID
      }
      if (s.ID === authServer?.ID) {
        opts.push({
          value: s.ID, key: s.Host + ":" + s.Port, selected: true
        })
      } else {
        opts.push({
          value: s.ID, key: s.Host + ":" + s.Port, selected: false
        })
      }
    })
    return (
      <div className="flex  items-start">

        <Select
          value={authServer ? authServer.ID : tunID}
          onValueChange={changeAuthServer}
        >
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="Select Auth Server" />
          </SelectTrigger>
          <SelectContent
            className={"bg-transparent" + state.Theme.borderColor + state.Theme?.mainBG}
          >
            <SelectGroup>
              {opts?.map(t => {
                if (t.selected === true) {
                  return (
                    <SelectItem className={state.Theme?.activeSelect} value={t.value}>{t.key}</SelectItem>
                  )
                } else {
                  return (
                    <SelectItem className={state.Theme?.neutralSelect} value={t.value}>{t.key}</SelectItem>
                  )
                }
              })}
            </SelectGroup>
          </SelectContent>
        </Select >
        <div className="flex mr-4 items-center space-x-2 mt-[8px] ml-[25px]">
          <CopyPlusIcon onClick={() => setModalOpen(true)} className={"hover:stroke-emerald-500 cursor-pointer"} />
        </div>
        <div className="flex mr-4 items-center space-x-2 mt-[8px] ml-[10px]">
          <Edit2Icon
            onClick={() => {
              setNewAuth(authServer)
              setModalOpen(true)
            }}
            className={"hover:stroke-emerald-500 cursor-pointer"} />
        </div>

      </div >
    )
  }

  const LoginForm = () => {
    return (
      <Card className="w-full max-w-md mx-auto bg-[#0B0E14] border border-[#1a1f2d] shadow-2xl">
        <CardContent className="space-y-6 p-6">
          {EmailInput()}
          {DeviceInput()}
          {PasswordInput()}
          {TwoFactorInput()}
          {selectForm()}
          <Button className="w-full h-11 bg-[#4B7BF5] hover:bg-[#4B7BF5]/90 text-white" onClick={HandleSubmit}>
            Login
          </Button>
          <div className="flex items-center space-x-2">
            <Switch
              checked={remember}
              onCheckedChange={() => setRememeber(!remember)}
            />
            <Label htmlFor="airplane-mode">Remember Login</Label>
          </div>
        </CardContent>
      </Card>
    );
  };

  const RegisterAnonForm = () => {
    return (
      <Card className="w-full max-w-md mx-auto bg-[#0B0E14] border border-[#1a1f2d] shadow-2xl">
        <CardContent className="space-y-6 p-6">
          <div className="text-center mb-2">
            <h1 className="text-lg font-medium text-white/80">Anonymous Registration</h1>
          </div>
          <Alert className="border-2 border-red-500 bg-red-500/10">
            <AlertDescription className="font-medium text-red-500">
              Save your login token in a secure place, it is the only form of authentication you have for your account. If you lose the token your account is lost forever.
            </AlertDescription>
          </Alert>
          {TokenInput()}
          {PasswordInput()}
          {ConfirmPasswordInput()}
          {selectForm()}
          <Button className="w-full h-11 bg-[#4B7BF5] hover:bg-[#4B7BF5]/90 text-white" onClick={RegisterSubmit}>
            Register
          </Button>
        </CardContent>
      </Card>
    );
  };

  const RegisterForm = () => {
    return (
      <Card className="w-full max-w-md mx-auto bg-[#0B0E14] border border-[#1a1f2d] shadow-2xl">
        <CardContent className="space-y-6 p-6">
          <div className="text-center mb-2">
            <h1 className="text-lg font-medium text-white/80">Create your account</h1>
          </div>
          {tokenLogin && TokenInput()}
          {!tokenLogin && EmailInput()}
          {PasswordInput()}
          {ConfirmPasswordInput()}
          {selectForm()}
          <Button className="w-full h-11 bg-[#4B7BF5] hover:bg-[#4B7BF5]/90 text-white" onClick={RegisterSubmit}>
            Register
          </Button>
        </CardContent>
      </Card>
    );
  };

  const ResetPasswordForm = () => {
    return (
      <Card className="w-full max-w-md mx-auto bg-[#0B0E14] border border-[#1a1f2d] shadow-2xl">
        <CardContent className="space-y-6 p-6">
          <div className="text-center mb-2">
            <h1 className="text-lg font-medium text-white/80">Reset your password</h1>
          </div>
          {EmailInput()}
          {PasswordInput()}
          {ConfirmPasswordInput()}
          {ResetTwoFactorCodeInput()}
          {selectForm()}
          <div className="flex space-x-2">
            <Button className="flex-1 h-11 bg-[#4B7BF5] hover:bg-[#4B7BF5]/90 text-white" onClick={() => ResetSubmit()}>
              Reset Password
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const RecoverTwoFactorForm = () => {
    return (
      <Card className="w-full max-w-md mx-auto bg-[#0B0E14] border border-[#1a1f2d] shadow-2xl">
        <CardContent className="space-y-6 p-6">
          <div className="text-center mb-2">
            <h1 className="text-lg font-medium text-white/80">Two-Factor Recovery</h1>
          </div>
          {EmailInput()}
          {PasswordInput()}
          {RecoveryInput()}
          {selectForm()}
          <Button className="w-full h-11 bg-[#4B7BF5] hover:bg-[#4B7BF5]/90 text-white" onClick={HandleSubmit}>
            Login
          </Button>
        </CardContent>
      </Card>
    );
  };

  const EnableAccountForm = () => {
    return (
      <Card className="w-full max-w-md mx-auto bg-[#0B0E14] border border-[#1a1f2d] shadow-2xl">
        <CardContent className="space-y-6 p-6">
          <div className="text-center mb-2">
            <h1 className="text-lg font-medium text-white/80">Enable your account</h1>
          </div>
          {EmailInput()}
          {CodeInput()}
          {selectForm()}
          <Button className="w-full h-11 bg-[#4B7BF5] hover:bg-[#4B7BF5]/90 text-white" onClick={EnableSubmit}>
            Enable Account
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-4 bg-black mt-10">


      <NewObjectEditorDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        object={newAuth}
        description=""
        readOnly={false}
        saveButton={() => {
          saveNewAuth()
          setModalOpen(false)
        }}
        onChange={(key, value, type) => {
          let a = { ...newAuth }
          a[key] = value
          setNewAuth({ ...a })
          console.log(key, value, type)
        }}
      />

      <div className="w-full max-w-md space-y-6">
        {mode === 1 && LoginForm()}
        {mode === 2 && RegisterForm()}
        {mode === 4 && ResetPasswordForm()}
        {mode === 3 && RecoverTwoFactorForm()}
        {mode === 5 && RegisterAnonForm()}
        {mode === 6 && EnableAccountForm()}
        < div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          <Button
            variant="ghost"
            onClick={() => setMode(1)}
            className={`h-9 px-4 text-[18px]  ${mode === 1
              ? 'text-[#4B7BF5] hover:text-[#4B7BF5] hover:bg-[#4B7BF5]/10'
              : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
          >
            Login
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              RemoveToken();
              setMode(2);
            }}
            className={`h-9 px-4 text-[18px] ${mode === 2
              ? 'text-[#4B7BF5] hover:text-[#4B7BF5] hover:bg-[#4B7BF5]/10'
              : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
          >
            Register
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              GenerateToken();
              setMode(5);
            }}
            className={`h-9 px-4 text-[18px] ${mode === 5
              ? 'text-[#4B7BF5] hover:text-[#4B7BF5] hover:bg-[#4B7BF5]/10'
              : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
          >
            Register Anonymously
          </Button>
          <Button
            variant="ghost"
            onClick={() => setMode(4)}
            className={`h-9 px-4 text-[18px] ${mode === 4
              ? 'text-[#4B7BF5] hover:text-[#4B7BF5] hover:bg-[#4B7BF5]/10'
              : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
          >
            Reset Password
          </Button>
          <Button
            variant="ghost"
            onClick={() => setMode(3)}
            className={`h-9 px-4 text-[18px] ${mode === 3
              ? 'text-[#4B7BF5] hover:text-[#4B7BF5] hover:bg-[#4B7BF5]/10'
              : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
          >
            2FA Recovery
          </Button>
        </div>
      </div>
    </div >
  );
};

export default Login;
